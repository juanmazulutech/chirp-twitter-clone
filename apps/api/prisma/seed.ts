// Demo data (docs/ARCHITECTURE.md §9). Grows with each feature (ADR-21).
//   npm run db:seed                       reset application data and seed it again
//   tsx prisma/seed.ts --if-empty         seed only an empty database (Docker entrypoint)
import { fileURLToPath } from 'node:url';

import { loadEnv } from '../src/config/env';
import type { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/lib/password';
import { createPrismaClient } from '../src/lib/prisma-client';
import { seedFollows } from './seed-data/follows';
import { pickSeedLikes, seedLikeDate } from './seed-data/likes';
import { seedTweetDate, seedTweets } from './seed-data/tweets';
import { SEED_EMAIL_DOMAIN, SEED_PASSWORD, seedPersonas } from './seed-data/users';

export type SeedMode = 'reset' | 'if-empty';

export interface SeedOptions {
  mode?: SeedMode;
  /** Chirp times are relative to this moment; injectable so tests are deterministic. */
  now?: Date;
}

export interface SeedResult {
  seeded: boolean;
  users: number;
  tweets: number;
  follows: number;
  likes: number;
}

export async function seedDatabase(
  prisma: PrismaClient,
  { mode = 'reset', now = new Date() }: SeedOptions = {},
): Promise<SeedResult> {
  if (mode === 'if-empty' && (await prisma.user.count()) > 0) {
    return { seeded: false, users: 0, tweets: 0, follows: 0, likes: 0 };
  }

  // Each account gets its own salted hash, like a real registration.
  const users = await Promise.all(
    seedPersonas.map(async (persona) => ({
      email: `${persona.username}@${SEED_EMAIL_DOMAIN}`,
      username: persona.username,
      displayName: persona.displayName,
      bio: persona.bio,
      passwordHash: await hashPassword(SEED_PASSWORD),
      createdAt: new Date(persona.joinedAt),
    })),
  );

  return prisma.$transaction(async (tx) => {
    // Every application table cascades from users, so this clears all seeded data.
    await tx.user.deleteMany();
    const created = await tx.user.createManyAndReturn({
      data: users,
      select: { id: true, username: true, createdAt: true },
    });

    const ids = new Map(created.map((user) => [user.username, user.id]));
    const joinedAt = new Map(created.map((user) => [user.username, user.createdAt]));
    const idOf = (username: string): string => {
      const id = ids.get(username);
      if (!id) throw new Error(`Seed data references an unknown user: ${username}`);
      return id;
    };

    const follows = Object.entries(seedFollows).flatMap(([follower, followed]) =>
      followed.map((following) => ({ followerId: idOf(follower), followingId: idOf(following) })),
    );
    const tweets = Object.entries(seedTweets).flatMap(([author, chirps]) =>
      chirps.map((chirp) => ({
        authorId: idOf(author),
        content: chirp.content,
        createdAt: seedTweetDate(now, chirp),
      })),
    );

    await tx.follow.createMany({ data: follows });
    const createdTweets = await tx.tweet.createManyAndReturn({
      data: tweets,
      select: { id: true, authorId: true, createdAt: true, content: true },
    });

    // Matched by content rather than by position: RETURNING promises no order.
    const tweetKey = (authorId: string, createdAt: Date, content: string) =>
      `${authorId}|${createdAt.toISOString()}|${content}`;
    const tweetIds = new Map(
      createdTweets.map((tweet) => [
        tweetKey(tweet.authorId, tweet.createdAt, tweet.content),
        tweet.id,
      ]),
    );
    const likes = Object.entries(pickSeedLikes(seedFollows, seedTweets)).flatMap(([liker, refs]) =>
      refs.map(({ author, index }, position) => {
        const chirp = seedTweets[author]?.[index];
        const joined = joinedAt.get(liker);
        if (!chirp || !joined) throw new Error(`Seed like references unknown data: ${liker}`);
        const postedAt = seedTweetDate(now, chirp);
        const tweetId = tweetIds.get(tweetKey(idOf(author), postedAt, chirp.content));
        if (!tweetId) throw new Error(`Seed like references an unknown chirp by ${author}`);
        // Spread over the first hours after posting, so likes do not all share a timestamp.
        const delayMinutes = 5 + ((position * 37) % 240);
        return {
          userId: idOf(liker),
          tweetId,
          createdAt: seedLikeDate(now, postedAt, joined, delayMinutes),
        };
      }),
    );
    await tx.like.createMany({ data: likes });

    return {
      seeded: true,
      users: created.length,
      tweets: tweets.length,
      follows: follows.length,
      likes: likes.length,
    };
  });
}

/** CLI entry point; arguments, environment and output are injectable for tests. */
export async function runSeedCli(
  argv: string[] = process.argv,
  env: Record<string, string | undefined> = process.env,
  write: (message: string) => void = (message) => process.stdout.write(message),
): Promise<void> {
  const mode: SeedMode = argv.includes('--if-empty') ? 'if-empty' : 'reset';
  const prisma = createPrismaClient(loadEnv(env).DATABASE_URL);

  try {
    const result = await seedDatabase(prisma, { mode });
    write(
      result.seeded
        ? `Seeded ${result.users} users, ${result.tweets} chirps, ${result.follows} follows ` +
            `and ${result.likes} likes. ` +
            `Sign in as demo@${SEED_EMAIL_DOMAIN} / ${SEED_PASSWORD}\n`
        : 'Database already has data; skipping seed (--if-empty).\n',
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await runSeedCli();
