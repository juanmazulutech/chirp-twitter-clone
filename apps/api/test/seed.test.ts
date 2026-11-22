import {
  emailSchema,
  pageSchema,
  tweetContentSchema,
  tweetSchema,
  usernameSchema,
} from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runSeedCli, seedDatabase, UnsafeSeedResetError } from '../prisma/seed';
import { seedFollows } from '../prisma/seed-data/follows';
import {
  pickSeedLikes,
  SEED_LIKES_MAX,
  SEED_LIKES_MIN,
  seedLikeDate,
} from '../prisma/seed-data/likes';
import { seedTweetDate, seedTweets } from '../prisma/seed-data/tweets';
import {
  DEMO_USERNAME,
  SEED_EMAIL_DOMAIN,
  SEED_PASSWORD,
  seedPersonas,
} from '../prisma/seed-data/users';
import type { App } from '../src/app';
import { buildTestApp } from './app';
import { loginAs } from './auth';
import { resetDatabase } from './database';
import { TEST_STORAGE_ENV, testDatabaseUrl } from './env';
import { createUser } from './factories/users';

describe('seed', () => {
  let app: App;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app.prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates at least 10 users with valid, normalized identifiers', async () => {
    const result = await seedDatabase(app.prisma);

    expect(result).toMatchObject({ seeded: true, users: seedPersonas.length });
    const users = await app.prisma.user.findMany();
    expect(users.length).toBeGreaterThanOrEqual(10);
    for (const user of users) {
      expect(emailSchema.parse(user.email)).toBe(user.email);
      expect(usernameSchema.parse(user.username)).toBe(user.username);
      expect(user.bio.length).toBeGreaterThan(0);
    }
  });

  it('gives every account its own password hash', async () => {
    await seedDatabase(app.prisma);

    const hashes = (await app.prisma.user.findMany()).map((user) => user.passwordHash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('lets the documented demo account sign in', async () => {
    await seedDatabase(app.prisma);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: `${DEMO_USERNAME}@${SEED_EMAIL_DOMAIN}`, password: SEED_PASSWORD },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ user: { username: DEMO_USERNAME } });
  });

  it('keeps the personas join dates', async () => {
    await seedDatabase(app.prisma);

    const ana = await app.prisma.user.findUniqueOrThrow({ where: { username: 'ana_codes' } });
    expect(ana.createdAt.toISOString()).toBe('2026-03-12T14:20:00.000Z');
  });

  it('is idempotent in reset mode and, when allowed, replaces non-seed data', async () => {
    await createUser(app.prisma, { username: 'leftover' });

    await seedDatabase(app.prisma, { allowNonSeedData: true });
    await seedDatabase(app.prisma);

    expect(await app.prisma.user.count()).toBe(seedPersonas.length);
    expect(await app.prisma.user.findUnique({ where: { username: 'leftover' } })).toBeNull();
    expect(await app.prisma.tweet.count()).toBe(Object.values(seedTweets).flat().length);
    expect(await app.prisma.follow.count()).toBe(Object.values(seedFollows).flat().length);
    expect(await app.prisma.like.count()).toBe(
      Object.values(pickSeedLikes(seedFollows, seedTweets)).flat().length,
    );
  });

  describe('chirps', () => {
    const usernames = seedPersonas.map((persona) => persona.username);
    const DAY = 24 * 60 * 60 * 1000;

    it('gives every persona 8–15 chirps and none to unknown users', () => {
      expect(Object.keys(seedTweets).sort()).toEqual([...usernames].sort());
      for (const chirps of Object.values(seedTweets)) {
        expect(chirps.length).toBeGreaterThanOrEqual(8);
        expect(chirps.length).toBeLessThanOrEqual(15);
      }
    });

    it('only contains content the API itself would accept', () => {
      for (const { content, at } of Object.values(seedTweets).flat()) {
        expect(tweetContentSchema.parse(content)).toBe(content);
        expect(at).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      }
    });

    it('stores every chirp at its relative time, within the last 30 days', async () => {
      const now = new Date('2026-11-21T12:00:00.000Z');
      const result = await seedDatabase(app.prisma, { now });

      const tweets = await app.prisma.tweet.findMany({ include: { author: true } });
      expect(tweets).toHaveLength(result.tweets);
      for (const tweet of tweets) {
        expect(tweet.createdAt.getTime()).toBeLessThan(now.getTime());
        expect(tweet.createdAt.getTime()).toBeGreaterThan(now.getTime() - 30 * DAY);
        expect(tweet.createdAt.getTime()).toBeGreaterThan(tweet.author.createdAt.getTime());
      }
    });

    it('places a chirp on its day and time of day', () => {
      const now = new Date('2026-11-21T08:00:00.000Z');

      expect(seedTweetDate(now, { daysAgo: 1, at: '23:59', content: 'x' }).toISOString()).toBe(
        '2026-11-20T23:59:00.000Z',
      );
      expect(seedTweetDate(now, { daysAgo: 29, at: '00:00', content: 'x' }).toISOString()).toBe(
        '2026-10-23T00:00:00.000Z',
      );
    });
  });

  describe('follow graph', () => {
    const usernames = new Set(seedPersonas.map((persona) => persona.username));

    it('has every persona follow 4–9 known, distinct others and never themselves', () => {
      expect(Object.keys(seedFollows).sort()).toEqual([...usernames].sort());
      for (const [follower, followed] of Object.entries(seedFollows)) {
        expect(followed.length).toBeGreaterThanOrEqual(4);
        expect(followed.length).toBeLessThanOrEqual(9);
        expect(new Set(followed).size).toBe(followed.length);
        expect(followed).not.toContain(follower);
        for (const username of followed) expect(usernames.has(username)).toBe(true);
      }
    });

    it('has the demo account follow exactly 8 people', async () => {
      await seedDatabase(app.prisma);

      const demo = await app.prisma.user.findUniqueOrThrow({
        where: { username: DEMO_USERNAME },
        include: { _count: { select: { following: true } } },
      });
      expect(demo._count.following).toBe(8);
    });

    it('gives the demo account a populated timeline with more pages to load', async () => {
      await seedDatabase(app.prisma);
      const demo = await app.prisma.user.findUniqueOrThrow({ where: { username: DEMO_USERNAME } });

      const response = await app.inject({
        method: 'GET',
        url: '/api/timeline',
        headers: { cookie: await loginAs(app, demo) },
      });

      expect(response.statusCode).toBe(200);
      const page = pageSchema(tweetSchema).parse(response.json());
      expect(page.items).toHaveLength(20);
      expect(page.nextCursor).not.toBeNull();
      const visibleAuthors = new Set([DEMO_USERNAME, ...(seedFollows[DEMO_USERNAME] ?? [])]);
      for (const tweet of page.items) expect(visibleAuthors.has(tweet.author.username)).toBe(true);
    });
  });

  describe('cross-likes', () => {
    const likes = pickSeedLikes(seedFollows, seedTweets);

    it('has every persona like 10–30 distinct chirps, only by people they follow', () => {
      expect(Object.keys(likes).sort()).toEqual(Object.keys(seedFollows).sort());
      for (const [liker, refs] of Object.entries(likes)) {
        expect(refs.length).toBeGreaterThanOrEqual(SEED_LIKES_MIN);
        expect(refs.length).toBeLessThanOrEqual(SEED_LIKES_MAX);
        const keys = refs.map(({ author, index }) => `${author}#${index}`);
        expect(new Set(keys).size).toBe(keys.length);
        for (const { author, index } of refs) {
          expect(seedFollows[liker]).toContain(author);
          expect(seedTweets[author]?.[index]).toBeDefined();
        }
      }
    });

    it('picks the same likes on every run', () => {
      expect(pickSeedLikes(seedFollows, seedTweets)).toEqual(likes);
    });

    it('does not give every persona the same number of likes', () => {
      expect(new Set(Object.values(likes).map((refs) => refs.length)).size).toBeGreaterThan(1);
    });

    it('stores likes after the chirp was posted and the liker joined, never in the future', async () => {
      const now = new Date('2026-11-21T12:00:00.000Z');
      const result = await seedDatabase(app.prisma, { now });

      const rows = await app.prisma.like.findMany({ include: { tweet: true, user: true } });
      expect(rows).toHaveLength(result.likes);
      for (const like of rows) {
        expect(like.tweet.authorId).not.toBe(like.userId);
        expect(like.createdAt.getTime()).toBeGreaterThan(like.tweet.createdAt.getTime());
        expect(like.createdAt.getTime()).toBeGreaterThan(like.user.createdAt.getTime());
        expect(like.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
      }
    });

    it('clamps a like date to now', () => {
      const now = new Date('2026-11-21T12:00:00.000Z');
      const posted = new Date('2026-11-21T11:59:00.000Z');

      expect(seedLikeDate(now, posted, new Date('2026-01-01'), 60)).toEqual(now);
    });

    it('shows like counts and the demo account’s own likes on its first timeline page', async () => {
      await seedDatabase(app.prisma);
      const demo = await app.prisma.user.findUniqueOrThrow({ where: { username: DEMO_USERNAME } });

      const response = await app.inject({
        method: 'GET',
        url: '/api/timeline',
        headers: { cookie: await loginAs(app, demo) },
      });

      const page = pageSchema(tweetSchema).parse(response.json());
      expect(page.items.some((tweet) => tweet.likedByMe)).toBe(true);
      expect(page.items.filter((tweet) => tweet.likeCount > 0).length).toBeGreaterThan(10);
    });
  });

  describe('reset guard', () => {
    it('refuses to delete accounts the seed did not create, leaving the data untouched', async () => {
      const user = await createUser(app.prisma, { username: 'real_person' });
      await app.prisma.tweet.create({ data: { authorId: user.id, content: 'Keep me' } });

      await expect(seedDatabase(app.prisma)).rejects.toThrow(
        new UnsafeSeedResetError('the database has 1 account(s) the seed did not create'),
      );
      expect(await app.prisma.user.count()).toBe(1);
      expect(await app.prisma.tweet.count()).toBe(1);
    });

    it('treats a seed username with a different email as a non-seed account', async () => {
      await createUser(app.prisma, { username: DEMO_USERNAME, email: 'someone@example.com' });

      await expect(seedDatabase(app.prisma)).rejects.toThrow(UnsafeSeedResetError);
    });

    it('resets freely when the database holds only seed accounts and their activity', async () => {
      await seedDatabase(app.prisma);
      const demo = await app.prisma.user.findUniqueOrThrow({ where: { username: DEMO_USERNAME } });
      await app.prisma.tweet.create({
        data: { authorId: demo.id, content: 'Posted while testing' },
      });

      const result = await seedDatabase(app.prisma);

      expect(result.seeded).toBe(true);
      expect(await app.prisma.tweet.count()).toBe(result.tweets);
    });
  });

  it('leaves a database with data untouched in if-empty mode', async () => {
    await createUser(app.prisma, { username: 'existing' });

    const result = await seedDatabase(app.prisma, { mode: 'if-empty' });

    expect(result).toEqual({ seeded: false, users: 0, tweets: 0, follows: 0, likes: 0 });
    expect(await app.prisma.user.count()).toBe(1);
  });

  it('seeds an empty database in if-empty mode', async () => {
    const result = await seedDatabase(app.prisma, { mode: 'if-empty' });

    expect(result.seeded).toBe(true);
    expect(await app.prisma.user.count()).toBe(seedPersonas.length);
  });

  describe('command line', () => {
    const databaseName = new URL(testDatabaseUrl()).pathname.slice(1);
    const run = async (argv: string[], env: Record<string, string> = {}) => {
      const output: string[] = [];
      await runSeedCli(
        argv,
        { DATABASE_URL: testDatabaseUrl(), ...TEST_STORAGE_ENV, ...env },
        (line) => output.push(line),
      );
      return output.join('');
    };

    it('resets and seeds by default, printing the demo credentials', async () => {
      const output = await run(['node', 'seed.ts']);

      expect(output).toContain(`demo@${SEED_EMAIL_DOMAIN} / ${SEED_PASSWORD}`);
      expect(output).toMatch(/\d+ chirps, \d+ follows and \d+ likes/);
      expect(await app.prisma.user.count()).toBe(seedPersonas.length);
    });

    it('refuses to reset non-seed accounts and explains how to confirm', async () => {
      await createUser(app.prisma, { username: 'leftover' });

      const attempt = run(['node', 'seed.ts']);

      await expect(attempt).rejects.toThrow(UnsafeSeedResetError);
      await expect(attempt).rejects.toThrow(
        `Refusing to reset "${databaseName}": the database has 1 account(s)`,
      );
      await expect(attempt).rejects.toThrow(`SEED_CONFIRM_RESET=${databaseName} npm run db:seed`);
      expect(await app.prisma.user.count()).toBe(1);
    });

    it('resets non-seed accounts when SEED_CONFIRM_RESET names the database', async () => {
      await createUser(app.prisma, { username: 'leftover' });

      await run(['node', 'seed.ts'], { SEED_CONFIRM_RESET: databaseName });

      expect(await app.prisma.user.findUnique({ where: { username: 'leftover' } })).toBeNull();
      expect(await app.prisma.user.count()).toBe(seedPersonas.length);
    });

    it('refuses a SEED_CONFIRM_RESET that names another database, before connecting', async () => {
      await createUser(app.prisma, { username: 'leftover' });

      await expect(run(['node', 'seed.ts'], { SEED_CONFIRM_RESET: 'chirp' })).rejects.toThrow(
        `SEED_CONFIRM_RESET is "chirp" but DATABASE_URL points to "${databaseName}"`,
      );
      expect(await app.prisma.user.count()).toBe(1);
    });

    it('skips a database with data when called with --if-empty', async () => {
      await createUser(app.prisma);

      const output = await run(['node', 'seed.ts', '--if-empty']);

      expect(output).toContain('skipping seed');
      expect(await app.prisma.user.count()).toBe(1);
    });
  });
});
