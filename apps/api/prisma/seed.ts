// Demo data (docs/ARCHITECTURE.md §9). Grows with each feature (ADR-21).
//   npm run db:seed                       reset application data and seed it again
//   SEED_CONFIRM_RESET=<db> npm run db:seed   reset even if it holds non-seed accounts
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
  /** Reset mode only: also delete accounts that the seed did not create (ADR-23). */
  allowNonSeedData?: boolean;
}

/** Thrown instead of deleting data the seed cannot recreate (ADR-23). */
export class UnsafeSeedResetError extends Error {
  override readonly name = 'UnsafeSeedResetError';
}

const seedEmail = (username: string) => `${username}@${SEED_EMAIL_DOMAIN}`;

export interface SeedResult {
  seeded: boolean;
  users: number;
  tweets: number;
  follows: number;
  likes: number;
}

export async function seedDatabase(
  prisma: PrismaClient,
  { mode = 'reset', now = new Date(), allowNonSeedData = false }: SeedOptions = {},
): Promise<SeedResult> {
  if (mode === 'if-empty' && (await prisma.user.count()) > 0) {
    return { seeded: false, users: 0, tweets: 0, follows: 0, likes: 0 };
  }

  // Each account gets its own salted hash, like a real registration.
  const users = await Promise.all(
    seedPersonas.map(async (persona) => ({
      email: seedEmail(persona.username),
      username: persona.username,
      displayName: persona.displayName,
      bio: persona.bio,
      passwordHash: await hashPassword(SEED_PASSWORD),
      createdAt: new Date(persona.joinedAt),
    })),
  );

  return prisma.$transaction(async (tx) => {
    // Checked inside the transaction so an account registered meanwhile is not lost.
    if (!allowNonSeedData) {
      const nonSeedAccounts = await tx.user.count({
        where: {
          OR: [
            { username: { notIn: seedPersonas.map((persona) => persona.username) } },
            { email: { notIn: seedPersonas.map((persona) => seedEmail(persona.username)) } },
          ],
        },
      });
      if (nonSeedAccounts > 0) {
        throw new UnsafeSeedResetError(
          `the database has ${nonSeedAccounts} account(s) the seed did not create`,
        );
      }
    }

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
  const { DATABASE_URL } = loadEnv(env);
  const databaseName = decodeURIComponent(new URL(DATABASE_URL).pathname.replace(/^\//, ''));
  const confirmation = env.SEED_CONFIRM_RESET;
  // Naming the database, not a yes/no flag, so a confirmation meant for one database
  // (or left in a shell or .env) cannot wipe another.
  if (confirmation !== undefined && confirmation !== databaseName) {
    throw new UnsafeSeedResetError(
      `Refusing to reset: SEED_CONFIRM_RESET is "${confirmation}" but DATABASE_URL points to "${databaseName}"`,
    );
  }
  const prisma = createPrismaClient(DATABASE_URL);

  try {
    const result = await seedDatabase(prisma, {
      mode,
      allowNonSeedData: confirmation === databaseName,
    }).catch((error: unknown) => {
      if (!(error instanceof UnsafeSeedResetError)) throw error;
      throw new UnsafeSeedResetError(
        `Refusing to reset "${databaseName}": ${error.message}, and resetting would delete them ` +
          `with all their data. If that is intended, run:\n` +
          `  SEED_CONFIRM_RESET=${databaseName} npm run db:seed`,
      );
    });
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runSeedCli().catch((error: unknown) => {
    // A refusal is an expected outcome: print the instructions, not a stack trace.
    if (!(error instanceof UnsafeSeedResetError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
