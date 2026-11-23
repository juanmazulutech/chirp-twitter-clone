import { pageSchema, tweetSchema, userProfileSchema } from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createFollow } from '../../../test/factories/follows';
import { createLike } from '../../../test/factories/likes';
import { createTweet } from '../../../test/factories/tweets';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import type { User } from '../../generated/prisma/client';
import { encodeCursor } from '../../lib/cursor';

const tweetPage = pageSchema(tweetSchema);

describe('users routes', () => {
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

  const headers = (cookie?: string) => (cookie ? { cookie } : {});
  const getProfile = (username: string, cookie?: string) =>
    app.inject({ method: 'GET', url: `/api/users/${username}`, headers: headers(cookie) });
  const patchMe = (payload: object, cookie?: string) =>
    app.inject({ method: 'PATCH', url: '/api/users/me', payload, headers: headers(cookie) });
  const getTweets = (username: string, cookie?: string, query: Record<string, string> = {}) =>
    app.inject({
      method: 'GET',
      url: `/api/users/${username}/tweets`,
      query,
      headers: headers(cookie),
    });

  const getReplies = (username: string, cookie?: string, query: Record<string, string> = {}) =>
    app.inject({
      method: 'GET',
      url: `/api/users/${username}/replies`,
      query,
      headers: headers(cookie),
    });

  const errorCode = (body: unknown) => (body as { error: { code: string } }).error.code;
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
  const tweetAt = (author: Pick<User, 'id'>, minutes: number) =>
    createTweet(app.prisma, author, { createdAt: minutesAgo(minutes) });

  describe('GET /api/users/:username', () => {
    it('returns the profile with its counts, as seen by a follower', async () => {
      const viewer = await createUser(app.prisma);
      const ana = await createUser(app.prisma, {
        username: 'ana',
        displayName: 'Ana',
        bio: 'Writes code.',
      });
      await createFollow(app.prisma, viewer, ana);
      await createFollow(app.prisma, await createUser(app.prisma), ana);
      await createFollow(app.prisma, ana, viewer);
      const chirp = await createTweet(app.prisma, ana);
      // Replies are not counted: the profile lists top-level chirps only (ADR-24).
      await createTweet(app.prisma, ana, { parentId: chirp.id });
      await createTweet(app.prisma, viewer);

      const response = await getProfile('ana', await loginAs(app, viewer));

      expect(response.statusCode).toBe(200);
      expect(userProfileSchema.parse(response.json())).toEqual({
        id: ana.id,
        username: 'ana',
        displayName: 'Ana',
        avatarUrl: null,
        bio: 'Writes code.',
        createdAt: ana.createdAt.toISOString(),
        followersCount: 2,
        followingCount: 1,
        tweetsCount: 1,
        isFollowing: true,
        isMe: false,
      });
    });

    it('marks the viewer’s own profile and never as followed', async () => {
      const ana = await createUser(app.prisma, { username: 'ana' });

      const response = await getProfile('ana', await loginAs(app, ana));

      expect(response.json()).toMatchObject({ isMe: true, isFollowing: false });
    });

    it('reports a profile the viewer does not follow', async () => {
      await createUser(app.prisma, { username: 'ana' });

      const response = await getProfile('ana', await loginAs(app, await createUser(app.prisma)));

      expect(response.json()).toMatchObject({ isMe: false, isFollowing: false, followersCount: 0 });
    });

    it('matches the username case-insensitively', async () => {
      await createUser(app.prisma, { username: 'ana' });

      const response = await getProfile('ANA', await loginAs(app, await createUser(app.prisma)));

      expect(response.statusCode).toBe(200);
    });

    it.each(['ghost', 'home'])('returns 404 for a username nobody has (%s)', async (username) => {
      const response = await getProfile(username, await loginAs(app, await createUser(app.prisma)));

      expect(response.statusCode).toBe(404);
      expect(errorCode(response.json())).toBe('NOT_FOUND');
    });

    it('returns 400 for a username longer than any account can have', async () => {
      const cookie = await loginAs(app, await createUser(app.prisma));

      expect((await getProfile('a'.repeat(16), cookie)).statusCode).toBe(400);
    });

    it('returns 401 without a session', async () => {
      await createUser(app.prisma, { username: 'ana' });

      expect((await getProfile('ana')).statusCode).toBe(401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('updates the display name and bio, trimmed, and returns the profile', async () => {
      const ana = await createUser(app.prisma, { username: 'ana', displayName: 'Ana' });

      const response = await patchMe(
        { displayName: '  Ana Torres ', bio: ' Writes code. ' },
        await loginAs(app, ana),
      );

      expect(response.statusCode).toBe(200);
      expect(userProfileSchema.parse(response.json())).toMatchObject({
        id: ana.id,
        displayName: 'Ana Torres',
        bio: 'Writes code.',
        isMe: true,
      });
      expect(await app.prisma.user.findUniqueOrThrow({ where: { id: ana.id } })).toMatchObject({
        displayName: 'Ana Torres',
        bio: 'Writes code.',
      });
    });

    it('changes only the fields sent', async () => {
      const ana = await createUser(app.prisma, { displayName: 'Ana', bio: 'Old bio' });

      const response = await patchMe({ bio: '' }, await loginAs(app, ana));

      expect(response.json()).toMatchObject({ displayName: 'Ana', bio: '' });
    });

    it('returns the profile untouched for an empty body', async () => {
      const ana = await createUser(app.prisma, { displayName: 'Ana', bio: 'Bio' });

      const response = await patchMe({}, await loginAs(app, ana));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ displayName: 'Ana', bio: 'Bio' });
    });

    it('ignores fields that are not editable', async () => {
      const ana = await createUser(app.prisma, { username: 'ana' });

      const response = await patchMe(
        { username: 'hacker', email: 'x@chirp.dev', bio: 'ok' },
        await loginAs(app, ana),
      );

      expect(response.statusCode).toBe(200);
      expect(await app.prisma.user.findUniqueOrThrow({ where: { id: ana.id } })).toMatchObject({
        username: 'ana',
        email: ana.email,
      });
    });

    it.each([
      ['a blank display name', { displayName: '   ' }, 'displayName'],
      ['a display name over 50 characters', { displayName: 'a'.repeat(51) }, 'displayName'],
      ['a bio over 160 characters', { bio: 'a'.repeat(161) }, 'bio'],
    ])('returns 400 for %s', async (_case, payload, field) => {
      const ana = await createUser(app.prisma, { displayName: 'Ana' });

      const response = await patchMe(payload, await loginAs(app, ana));

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          details: { fieldErrors: { [field]: [expect.any(String)] } },
        },
      });
      expect((await app.prisma.user.findUniqueOrThrow({ where: { id: ana.id } })).displayName).toBe(
        'Ana',
      );
    });

    it('accepts a 160-emoji bio, counted as code points', async () => {
      const ana = await createUser(app.prisma);

      const response = await patchMe({ bio: '🐦'.repeat(160) }, await loginAs(app, ana));

      expect(response.statusCode).toBe(200);
    });

    it('returns 401 without a session', async () => {
      expect((await patchMe({ bio: 'x' })).statusCode).toBe(401);
    });
  });

  describe('GET /api/users/:username/tweets', () => {
    it('returns only that user’s chirps, newest first, with the viewer’s likes', async () => {
      const viewer = await createUser(app.prisma);
      const ana = await createUser(app.prisma, { username: 'ana' });
      const old = await tweetAt(ana, 30);
      const recent = await tweetAt(ana, 10);
      await tweetAt(viewer, 5);
      await createLike(app.prisma, viewer, old);

      const response = await getTweets('ana', await loginAs(app, viewer));

      expect(response.statusCode).toBe(200);
      const page = tweetPage.parse(response.json());
      expect(
        page.items.map(({ id, likedByMe, likeCount }) => ({ id, likedByMe, likeCount })),
      ).toEqual([
        { id: recent.id, likedByMe: false, likeCount: 0 },
        { id: old.id, likedByMe: true, likeCount: 1 },
      ]);
      expect(page.nextCursor).toBeNull();
    });

    it('leaves out the user’s replies', async () => {
      const ana = await createUser(app.prisma, { username: 'ana' });
      const chirp = await tweetAt(ana, 10);
      const elsewhere = await tweetAt(await createUser(app.prisma), 20);
      await createTweet(app.prisma, ana, { parentId: chirp.id });
      await createTweet(app.prisma, ana, { parentId: elsewhere.id });

      const page = tweetPage.parse((await getTweets('ana', await loginAs(app, ana))).json());

      expect(page.items.map(({ id, replyCount }) => ({ id, replyCount }))).toEqual([
        { id: chirp.id, replyCount: 1 },
      ]);
    });

    it('shows anyone’s chirps, followed or not', async () => {
      const ana = await createUser(app.prisma, { username: 'ana' });
      await tweetAt(ana, 1);

      const page = tweetPage.parse(
        (await getTweets('ana', await loginAs(app, await createUser(app.prisma)))).json(),
      );

      expect(page.items).toHaveLength(1);
    });

    it('walks every page without duplicates or gaps', async () => {
      const ana = await createUser(app.prisma, { username: 'ana' });
      const created = [];
      for (let minutes = 1; minutes <= 5; minutes += 1) created.push(await tweetAt(ana, minutes));
      const cookie = await loginAs(app, ana);

      const first = tweetPage.parse((await getTweets('ana', cookie, { limit: '2' })).json());
      const second = tweetPage.parse(
        (await getTweets('ana', cookie, { limit: '2', cursor: first.nextCursor ?? '' })).json(),
      );
      const third = tweetPage.parse(
        (await getTweets('ana', cookie, { limit: '2', cursor: second.nextCursor ?? '' })).json(),
      );

      expect([...first.items, ...second.items, ...third.items].map((tweet) => tweet.id)).toEqual(
        created.map((tweet) => tweet.id),
      );
      expect(third.nextCursor).toBeNull();
    });

    it('returns an empty last page for a user with no chirps', async () => {
      await createUser(app.prisma, { username: 'ana' });

      const response = await getTweets('ana', await loginAs(app, await createUser(app.prisma)));

      expect(response.json()).toEqual({ items: [], nextCursor: null });
    });

    it('returns 404 for an unknown user', async () => {
      const response = await getTweets('ghost', await loginAs(app, await createUser(app.prisma)));

      expect(response.statusCode).toBe(404);
    });

    it.each([
      ['a malformed cursor', { cursor: 'not-a-cursor' }],
      ['a limit above 50', { limit: '51' }],
    ])('returns 400 for %s', async (_case, query) => {
      await createUser(app.prisma, { username: 'ana' });

      const response = await getTweets(
        'ana',
        await loginAs(app, await createUser(app.prisma)),
        query,
      );

      expect(response.statusCode).toBe(400);
    });

    it('accepts a well-formed cursor that points past every chirp', async () => {
      const ana = await createUser(app.prisma, { username: 'ana' });
      await tweetAt(ana, 1);
      const cursor = encodeCursor({
        createdAt: new Date('2000-01-01T00:00:00.000Z'),
        id: '019a0000-0000-7000-8000-000000000000',
      });

      const response = await getTweets('ana', await loginAs(app, ana), { cursor });

      expect(response.json()).toEqual({ items: [], nextCursor: null });
    });

    it('returns 401 without a session', async () => {
      await createUser(app.prisma, { username: 'ana' });

      expect((await getTweets('ana')).statusCode).toBe(401);
    });
  });

  describe('GET /api/users/:username/replies', () => {
    const replyAt = (author: Pick<User, 'id'>, parent: { id: string }, minutes: number) =>
      createTweet(app.prisma, author, { parentId: parent.id, createdAt: minutesAgo(minutes) });

    it('returns only that user’s replies, newest first, each with who it answers', async () => {
      const viewer = await createUser(app.prisma);
      const ana = await createUser(app.prisma, { username: 'ana' });
      const bruno = await createUser(app.prisma, { username: 'bruno' });
      const anaChirp = await tweetAt(ana, 60);
      const brunoChirp = await tweetAt(bruno, 50);
      const toBruno = await replyAt(ana, brunoChirp, 30);
      const toSelf = await replyAt(ana, anaChirp, 10);
      await replyAt(bruno, anaChirp, 5);
      await createLike(app.prisma, viewer, toBruno);

      const response = await getReplies('ana', await loginAs(app, viewer));

      expect(response.statusCode).toBe(200);
      const page = tweetPage.parse(response.json());
      expect(
        page.items.map(({ id, replyTo, likedByMe }) => ({
          id,
          answers: replyTo?.author.username,
          likedByMe,
        })),
      ).toEqual([
        { id: toSelf.id, answers: 'ana', likedByMe: false },
        { id: toBruno.id, answers: 'bruno', likedByMe: true },
      ]);
      expect(page.nextCursor).toBeNull();
    });

    it('walks every page without duplicates or gaps', async () => {
      const ana = await createUser(app.prisma, { username: 'ana' });
      const parent = await tweetAt(await createUser(app.prisma), 100);
      const created = [];
      for (let minutes = 1; minutes <= 5; minutes += 1) {
        created.push(await replyAt(ana, parent, minutes));
      }
      const cookie = await loginAs(app, ana);

      const first = tweetPage.parse((await getReplies('ana', cookie, { limit: '2' })).json());
      const second = tweetPage.parse(
        (await getReplies('ana', cookie, { limit: '2', cursor: first.nextCursor ?? '' })).json(),
      );
      const third = tweetPage.parse(
        (await getReplies('ana', cookie, { limit: '2', cursor: second.nextCursor ?? '' })).json(),
      );

      expect([...first.items, ...second.items, ...third.items].map((tweet) => tweet.id)).toEqual(
        created.map((tweet) => tweet.id),
      );
      expect(third.nextCursor).toBeNull();
    });

    it('breaks ties on the same instant by id', async () => {
      const ana = await createUser(app.prisma, { username: 'ana' });
      const parent = await tweetAt(await createUser(app.prisma), 100);
      const instant = minutesAgo(1);
      const tied = [];
      for (let index = 0; index < 3; index += 1) {
        tied.push(await createTweet(app.prisma, ana, { parentId: parent.id, createdAt: instant }));
      }
      const cookie = await loginAs(app, ana);

      const first = tweetPage.parse((await getReplies('ana', cookie, { limit: '2' })).json());
      const second = tweetPage.parse(
        (await getReplies('ana', cookie, { limit: '2', cursor: first.nextCursor ?? '' })).json(),
      );

      expect([...first.items, ...second.items].map((tweet) => tweet.id)).toEqual(
        tied
          .map((tweet) => tweet.id)
          .sort()
          .reverse(),
      );
    });

    it('returns an empty page for a user who has only posted chirps', async () => {
      const ana = await createUser(app.prisma, { username: 'ana' });
      await tweetAt(ana, 1);

      const response = await getReplies('ana', await loginAs(app, ana));

      expect(response.json()).toEqual({ items: [], nextCursor: null });
    });

    it('returns 404 for an unknown user', async () => {
      const response = await getReplies('ghost', await loginAs(app, await createUser(app.prisma)));

      expect(response.statusCode).toBe(404);
      expect(errorCode(response.json())).toBe('NOT_FOUND');
    });

    it('returns 400 for a malformed cursor, whether or not the user exists', async () => {
      const cookie = await loginAs(app, await createUser(app.prisma));
      await createUser(app.prisma, { username: 'ana' });

      for (const username of ['ana', 'ghost']) {
        const response = await getReplies(username, cookie, { cursor: 'not-a-cursor' });
        expect(response.statusCode).toBe(400);
      }
    });

    it('returns 401 without a session', async () => {
      await createUser(app.prisma, { username: 'ana' });

      expect((await getReplies('ana')).statusCode).toBe(401);
    });
  });
});
