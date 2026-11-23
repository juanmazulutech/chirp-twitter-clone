import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  emailSchema,
  pageSchema,
  tweetContentSchema,
  tweetSchema,
  usernameSchema,
} from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { generateAvatars } from '../prisma/scripts/generate-avatars';
import { runSeedCli, seedDatabase, SeedStorageError, UnsafeSeedResetError } from '../prisma/seed';
import {
  renderSeedAvatar,
  SEED_AVATAR_DIR,
  seedAvatarKey,
  seedAvatarPath,
} from '../prisma/seed-data/avatars';
import { seedFollows } from '../prisma/seed-data/follows';
import {
  pickSeedLikes,
  SEED_LIKES_MAX,
  SEED_LIKES_MIN,
  seedLikeDate,
} from '../prisma/seed-data/likes';
import { flattenSeedThreads, seedReplyDate, seedThreads } from '../prisma/seed-data/replies';
import { seedTweetDate, seedTweets } from '../prisma/seed-data/tweets';
import {
  DEMO_USERNAME,
  SEED_EMAIL_DOMAIN,
  SEED_PASSWORD,
  seedPersonas,
} from '../prisma/seed-data/users';
import type { App } from '../src/app';
import { MemoryStorage } from '../src/lib/memory-storage';
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
    const result = await seedDatabase(app.prisma, app.storage);

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
    await seedDatabase(app.prisma, app.storage);

    const hashes = (await app.prisma.user.findMany()).map((user) => user.passwordHash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('lets the documented demo account sign in', async () => {
    await seedDatabase(app.prisma, app.storage);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: `${DEMO_USERNAME}@${SEED_EMAIL_DOMAIN}`, password: SEED_PASSWORD },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ user: { username: DEMO_USERNAME } });
  });

  it('keeps the personas join dates', async () => {
    await seedDatabase(app.prisma, app.storage);

    const ana = await app.prisma.user.findUniqueOrThrow({ where: { username: 'ana_codes' } });
    expect(ana.createdAt.toISOString()).toBe('2026-03-12T14:20:00.000Z');
  });

  it('is idempotent in reset mode and, when allowed, replaces non-seed data', async () => {
    await createUser(app.prisma, { username: 'leftover' });

    await seedDatabase(app.prisma, app.storage, { allowNonSeedData: true });
    await seedDatabase(app.prisma, app.storage);

    expect(await app.prisma.user.count()).toBe(seedPersonas.length);
    expect(await app.prisma.user.findUnique({ where: { username: 'leftover' } })).toBeNull();
    expect(await app.prisma.tweet.count({ where: { parentId: null } })).toBe(
      Object.values(seedTweets).flat().length,
    );
    expect(await app.prisma.tweet.count({ where: { parentId: { not: null } } })).toBe(
      flattenSeedThreads(seedThreads).length,
    );
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
      const result = await seedDatabase(app.prisma, app.storage, { now });

      const tweets = await app.prisma.tweet.findMany({
        where: { parentId: null },
        include: { author: true },
      });
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
      await seedDatabase(app.prisma, app.storage);

      const demo = await app.prisma.user.findUniqueOrThrow({
        where: { username: DEMO_USERNAME },
        include: { _count: { select: { following: true } } },
      });
      expect(demo._count.following).toBe(8);
    });

    it('gives the demo account a populated timeline with more pages to load', async () => {
      await seedDatabase(app.prisma, app.storage);
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

  describe('reply threads', () => {
    const flat = flattenSeedThreads(seedThreads);
    const follows = (from: string, to: string) => seedFollows[from]?.includes(to) ?? false;
    const answeredAuthor = ({ thread, parent }: (typeof flat)[number]) =>
      parent === null ? thread.to.author : (flat[parent]?.reply.author ?? '');

    it('answers existing chirps, with content the API itself would accept', () => {
      for (const { thread, reply } of flat) {
        expect(seedTweets[thread.to.author]?.[thread.to.index]).toBeDefined();
        expect(tweetContentSchema.parse(reply.content)).toBe(reply.content);
        expect(reply.minutesAfter).toBeGreaterThan(0);
      }
    });

    it('only has people connected by a follow answer each other, or themselves', () => {
      for (const item of flat) {
        const { author } = item.reply;
        const answered = answeredAuthor(item);
        expect(
          author === answered || follows(author, answered) || follows(answered, author),
          `${author} answering ${answered}`,
        ).toBe(true);
      }
    });

    it('nests conversations, includes a self-thread and replies on the demo account', () => {
      expect(Math.max(...flat.map((item) => item.depth))).toBeGreaterThanOrEqual(3);
      expect(flat.some((item) => item.reply.author === answeredAuthor(item))).toBe(true);
      expect(seedThreads.some((thread) => thread.to.author === DEMO_USERNAME)).toBe(true);
    });

    it('lists parents before their replies', () => {
      flat.forEach(({ parent }, position) => {
        if (parent !== null) expect(parent).toBeLessThan(position);
      });
    });

    it('stores every reply under the chirp it answers, after it and never in the future', async () => {
      const now = new Date('2026-11-21T12:00:00.000Z');
      const result = await seedDatabase(app.prisma, app.storage, { now });

      const replies = await app.prisma.tweet.findMany({
        where: { parentId: { not: null } },
        include: { parent: true, author: true },
      });
      expect(replies).toHaveLength(result.replies);
      expect(result.replies).toBe(flat.length);
      for (const reply of replies) {
        expect(reply.parent).not.toBeNull();
        expect(reply.createdAt.getTime()).toBeGreaterThanOrEqual(
          reply.parent?.createdAt.getTime() ?? 0,
        );
        expect(reply.createdAt.getTime()).toBeGreaterThan(reply.author.createdAt.getTime());
        expect(reply.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
      }
    });

    it('clamps a reply date to now', () => {
      const now = new Date('2026-11-21T12:00:00.000Z');

      expect(seedReplyDate(now, new Date('2026-11-21T11:59:00.000Z'), 30)).toEqual(now);
      expect(seedReplyDate(now, new Date('2026-11-21T10:00:00.000Z'), 30)).toEqual(
        new Date('2026-11-21T10:30:00.000Z'),
      );
    });

    it('shows reply counts on the demo account’s timeline', async () => {
      await seedDatabase(app.prisma, app.storage);
      const demo = await app.prisma.user.findUniqueOrThrow({ where: { username: DEMO_USERNAME } });

      const response = await app.inject({
        method: 'GET',
        url: '/api/timeline',
        query: { limit: '50' },
        headers: { cookie: await loginAs(app, demo) },
      });

      const page = pageSchema(tweetSchema).parse(response.json());
      expect(page.items.every((tweet) => tweet.replyTo === null)).toBe(true);
      expect(page.items.some((tweet) => tweet.replyCount > 0)).toBe(true);
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
      const result = await seedDatabase(app.prisma, app.storage, { now });

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
      await seedDatabase(app.prisma, app.storage);
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

      await expect(seedDatabase(app.prisma, app.storage)).rejects.toThrow(
        new UnsafeSeedResetError('the database has 1 account(s) the seed did not create'),
      );
      expect(await app.prisma.user.count()).toBe(1);
      expect(await app.prisma.tweet.count()).toBe(1);
    });

    it('treats a seed username with a different email as a non-seed account', async () => {
      await createUser(app.prisma, { username: DEMO_USERNAME, email: 'someone@example.com' });

      await expect(seedDatabase(app.prisma, app.storage)).rejects.toThrow(UnsafeSeedResetError);
    });

    it('resets freely when the database holds only seed accounts and their activity', async () => {
      await seedDatabase(app.prisma, app.storage);
      const demo = await app.prisma.user.findUniqueOrThrow({ where: { username: DEMO_USERNAME } });
      await app.prisma.tweet.create({
        data: { authorId: demo.id, content: 'Posted while testing' },
      });

      const result = await seedDatabase(app.prisma, app.storage);

      expect(result.seeded).toBe(true);
      expect(await app.prisma.tweet.count()).toBe(result.tweets + result.replies);
    });
  });

  it('leaves a database with data untouched in if-empty mode', async () => {
    await createUser(app.prisma, { username: 'existing' });

    const result = await seedDatabase(app.prisma, app.storage, { mode: 'if-empty' });

    expect(result).toEqual({
      seeded: false,
      users: 0,
      tweets: 0,
      replies: 0,
      follows: 0,
      likes: 0,
    });
    expect(await app.prisma.user.count()).toBe(1);
  });

  it('seeds an empty database in if-empty mode', async () => {
    const result = await seedDatabase(app.prisma, app.storage, { mode: 'if-empty' });

    expect(result.seeded).toBe(true);
    expect(await app.prisma.user.count()).toBe(seedPersonas.length);
  });

  describe('avatars', () => {
    it('uploads every persona’s committed SVG and points the account at it', async () => {
      const storage = new MemoryStorage();

      await seedDatabase(app.prisma, storage);

      const users = await app.prisma.user.findMany();
      expect(users).toHaveLength(seedPersonas.length);
      for (const user of users) {
        expect(user.avatarKey).toBe(seedAvatarKey(user.username));
        const object = storage.get(seedAvatarKey(user.username));
        expect(object?.contentType).toBe('image/svg+xml');
        expect(Buffer.from(object?.body ?? []).toString()).toBe(
          (await readFile(seedAvatarPath(user.username))).toString(),
        );
      }
    });

    it('shows the avatars as public URLs', async () => {
      await seedDatabase(app.prisma, app.storage);
      const demo = await app.prisma.user.findUniqueOrThrow({ where: { username: DEMO_USERNAME } });

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie: await loginAs(app, demo) },
      });

      expect(response.json()).toMatchObject({
        user: { avatarUrl: app.storage.publicUrl(seedAvatarKey(DEMO_USERNAME)) },
      });
    });

    it('fails before touching the database when storage is unreachable', async () => {
      await createUser(app.prisma, { username: 'keeper' });
      const storage = new MemoryStorage();
      storage.put = () => Promise.reject(new Error('connect ECONNREFUSED'));

      await expect(seedDatabase(app.prisma, storage)).rejects.toThrow(SeedStorageError);
      await expect(seedDatabase(app.prisma, storage)).rejects.toThrow(/npm run services:up/);
      expect(await app.prisma.user.findMany({ select: { username: true } })).toEqual([
        { username: 'keeper' },
      ]);
    });

    it('commits exactly the SVGs the generator produces, one per persona', async () => {
      const committed = (await readdir(SEED_AVATAR_DIR)).sort();
      expect(committed).toEqual(seedPersonas.map(({ username }) => `${username}.svg`).sort());
      for (const { username } of seedPersonas) {
        expect((await readFile(seedAvatarPath(username))).toString()).toBe(
          renderSeedAvatar(username),
        );
      }
    });

    it('generates a CC0 drawing that cannot run scripts', () => {
      const svg = renderSeedAvatar(DEMO_USERNAME);

      expect(svg).toContain('CC0 1.0');
      expect(svg).not.toMatch(/<script|\son\w+=|href="(?!#)/i);
      expect(renderSeedAvatar('ana_codes')).not.toBe(svg);
    });

    it('writes the avatars with the generation script', async () => {
      const directory = await mkdtemp(join(tmpdir(), 'chirp-avatars-'));
      const output: string[] = [];

      const written = await generateAvatars({ directory, write: (line) => output.push(line) });

      expect(written).toHaveLength(seedPersonas.length);
      expect(await readFile(join(directory, `${DEMO_USERNAME}.svg`), 'utf8')).toBe(
        renderSeedAvatar(DEMO_USERNAME),
      );
      expect(output.join('')).toContain(`Generated ${seedPersonas.length} avatars`);
      await rm(directory, { recursive: true });
    });
  });

  describe('command line', () => {
    const databaseName = new URL(testDatabaseUrl()).pathname.slice(1);
    const run = async (argv: string[], env: Record<string, string> = {}) => {
      const output: string[] = [];
      await runSeedCli(
        argv,
        { DATABASE_URL: testDatabaseUrl(), ...TEST_STORAGE_ENV, ...env },
        (line) => output.push(line),
        new MemoryStorage(),
      );
      return output.join('');
    };

    it('resets and seeds by default, printing the demo credentials', async () => {
      const output = await run(['node', 'seed.ts']);

      expect(output).toContain(`demo@${SEED_EMAIL_DOMAIN} / ${SEED_PASSWORD}`);
      expect(output).toMatch(/\d+ chirps, \d+ replies, \d+ follows and \d+ likes/);
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
