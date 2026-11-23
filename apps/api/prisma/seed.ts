// Demo data (docs/ARCHITECTURE.md §9). Grows with each feature (ADR-21).
//   npm run db:seed                       reset application data and seed it again
//   SEED_CONFIRM_RESET=<db> npm run db:seed   reset even if it holds non-seed accounts
//   tsx prisma/seed.ts --if-empty         seed only an empty database (Docker entrypoint)
// Needs the storage service (`npm run services:up`): it uploads the persona avatars.
import { fileURLToPath } from 'node:url';

import { createS3Storage } from '../src/app';
import { loadEnv } from '../src/config/env';
import type { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/lib/password';
import { createPrismaClient } from '../src/lib/prisma-client';
import type { StorageService } from '../src/lib/storage';
import { readSeedAvatar, seedAvatarKey } from './seed-data/avatars';
import { seedFollows } from './seed-data/follows';
import { pickSeedLikes, seedLikeDate } from './seed-data/likes';
import { flattenSeedThreads, seedReplyDate, seedThreads } from './seed-data/replies';
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

/** Storage could not take the avatars; nothing in the database has changed yet. */
export class SeedStorageError extends Error {
  override readonly name = 'SeedStorageError';
}

/**
 * Uploads every persona's committed SVG through `StorageService`, the path a user's own
 * avatar takes (ADR-16). Idempotent: the keys are per username, so re-seeding overwrites.
 */
export async function uploadSeedAvatars(storage: StorageService): Promise<void> {
  try {
    await Promise.all(
      seedPersonas.map(async ({ username }) =>
        storage.put({
          key: seedAvatarKey(username),
          body: await readSeedAvatar(username),
          contentType: 'image/svg+xml',
        }),
      ),
    );
  } catch (error) {
    throw new SeedStorageError(
      'Could not upload the seed avatars to storage. Is it running? Start it with ' +
        '`npm run services:up`, then seed again.',
      { cause: error },
    );
  }
}

/** Thrown instead of deleting data the seed cannot recreate (ADR-23). */
export class UnsafeSeedResetError extends Error {
  override readonly name = 'UnsafeSeedResetError';
}

const seedEmail = (username: string) => `${username}@${SEED_EMAIL_DOMAIN}`;

export interface SeedResult {
  seeded: boolean;
  users: number;
  /** Top-level chirps; replies are counted apart. */
  tweets: number;
  replies: number;
  follows: number;
  likes: number;
}

export async function seedDatabase(
  prisma: PrismaClient,
  storage: StorageService,
  { mode = 'reset', now = new Date(), allowNonSeedData = false }: SeedOptions = {},
): Promise<SeedResult> {
  if (mode === 'if-empty' && (await prisma.user.count()) > 0) {
    return { seeded: false, users: 0, tweets: 0, replies: 0, follows: 0, likes: 0 };
  }
  // Before the database changes: without storage there is nothing to show the avatars from.
  await uploadSeedAvatars(storage);

  // Each account gets its own salted hash, like a real registration.
  const users = await Promise.all(
    seedPersonas.map(async (persona) => ({
      email: seedEmail(persona.username),
      username: persona.username,
      displayName: persona.displayName,
      bio: persona.bio,
      avatarKey: seedAvatarKey(persona.username),
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
    const chirpAt = ({ author, index }: { author: string; index: number }) => {
      const chirp = seedTweets[author]?.[index];
      if (!chirp) throw new Error(`Seed data references an unknown chirp by ${author}`);
      const postedAt = seedTweetDate(now, chirp);
      const tweetId = tweetIds.get(tweetKey(idOf(author), postedAt, chirp.content));
      if (!tweetId) throw new Error(`Seed data references an unknown chirp by ${author}`);
      return { tweetId, postedAt };
    };

    // One by one, in thread order: each reply needs the id of the one it answers.
    const inserted: Array<{ id: string; createdAt: Date }> = [];
    for (const { reply, thread, parent } of flattenSeedThreads(seedThreads)) {
      const root = chirpAt(thread.to);
      const answered = parent === null ? undefined : inserted[parent];
      const createdAt = seedReplyDate(
        now,
        answered?.createdAt ?? root.postedAt,
        reply.minutesAfter,
      );
      inserted.push(
        await tx.tweet.create({
          data: {
            authorId: idOf(reply.author),
            parentId: answered?.id ?? root.tweetId,
            content: reply.content,
            createdAt,
          },
          select: { id: true, createdAt: true },
        }),
      );
    }

    const likes = Object.entries(pickSeedLikes(seedFollows, seedTweets)).flatMap(([liker, refs]) =>
      refs.map(({ author, index }, position) => {
        const joined = joinedAt.get(liker);
        if (!joined) throw new Error(`Seed like references an unknown user: ${liker}`);
        const { tweetId, postedAt } = chirpAt({ author, index });
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
      replies: inserted.length,
      follows: follows.length,
      likes: likes.length,
    };
  });
}

/**
 * CLI entry point; arguments, environment, output and storage are injectable for tests.
 * Without a storage, it talks to the configured S3 endpoint.
 */
export async function runSeedCli(
  argv: string[] = process.argv,
  env: Record<string, string | undefined> = process.env,
  write: (message: string) => void = (message) => process.stdout.write(message),
  injectedStorage?: StorageService,
): Promise<void> {
  const mode: SeedMode = argv.includes('--if-empty') ? 'if-empty' : 'reset';
  const config = loadEnv(env);
  const { DATABASE_URL } = config;
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
  const storage = injectedStorage ?? createS3Storage(config);

  try {
    const result = await seedDatabase(prisma, storage, {
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
        ? `Seeded ${result.users} users, ${result.tweets} chirps, ${result.replies} replies, ` +
            `${result.follows} follows ` +
            `and ${result.likes} likes. ` +
            `Sign in as demo@${SEED_EMAIL_DOMAIN} / ${SEED_PASSWORD}\n`
        : 'Database already has data; skipping seed (--if-empty).\n',
    );
  } finally {
    await prisma.$disconnect();
    if (!injectedStorage) await storage.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runSeedCli().catch((error: unknown) => {
    // A refusal or a missing storage is an expected outcome: print what to do, not a stack trace.
    if (!(error instanceof UnsafeSeedResetError || error instanceof SeedStorageError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
