import { tweetSchema } from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createLike } from '../../../test/factories/likes';
import { createTweet } from '../../../test/factories/tweets';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';

const UNKNOWN_ID = '019a0000-0000-7000-8000-000000000000';

describe('tweets routes', () => {
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
  const postTweet = (payload: object, cookie?: string) =>
    app.inject({ method: 'POST', url: '/api/tweets', payload, headers: headers(cookie) });
  const getTweet = (id: string, cookie?: string) =>
    app.inject({ method: 'GET', url: `/api/tweets/${id}`, headers: headers(cookie) });
  const deleteTweet = (id: string, cookie?: string) =>
    app.inject({ method: 'DELETE', url: `/api/tweets/${id}`, headers: headers(cookie) });
  const postReply = (parentId: string, payload: object, cookie?: string) =>
    app.inject({
      method: 'POST',
      url: `/api/tweets/${parentId}/replies`,
      payload,
      headers: headers(cookie),
    });

  const fieldErrors = (body: unknown) =>
    (body as { error: { details: { fieldErrors: Record<string, string[]> } } }).error.details
      .fieldErrors;

  describe('POST /api/tweets', () => {
    it('creates a tweet by the signed-in user and returns it', async () => {
      const ana = await createUser(app.prisma, { username: 'ana', displayName: 'Ana' });
      const cookie = await loginAs(app, ana);

      const response = await postTweet({ content: '  Hello, Chirp!  ' }, cookie);

      expect(response.statusCode).toBe(201);
      const tweet = tweetSchema.parse(response.json());
      expect(tweet).toMatchObject({
        content: 'Hello, Chirp!',
        imageUrl: null,
        author: { id: ana.id, username: 'ana', displayName: 'Ana', avatarUrl: null },
        likeCount: 0,
        likedByMe: false,
        replyCount: 0,
        replyTo: null,
      });
      const stored = await app.prisma.tweet.findUniqueOrThrow({ where: { id: tweet.id } });
      expect(stored).toMatchObject({ authorId: ana.id, content: 'Hello, Chirp!', parentId: null });
    });

    it('ignores an authorId in the body', async () => {
      const ana = await createUser(app.prisma);
      const bruno = await createUser(app.prisma);

      const response = await postTweet(
        { content: 'mine', authorId: bruno.id },
        await loginAs(app, ana),
      );

      expect(response.statusCode).toBe(201);
      expect(tweetSchema.parse(response.json()).author.id).toBe(ana.id);
    });

    it('accepts 280 emoji, counted as code points', async () => {
      const cookie = await loginAs(app, await createUser(app.prisma));

      const response = await postTweet({ content: '🐦'.repeat(280) }, cookie);

      expect(response.statusCode).toBe(201);
    });

    it.each([
      ['empty', ''],
      ['whitespace only', '   \n '],
      ['281 characters', 'a'.repeat(281)],
    ])('rejects %s content with 400', async (_case, content) => {
      const cookie = await loginAs(app, await createUser(app.prisma));

      const response = await postTweet({ content }, cookie);

      expect(response.statusCode).toBe(400);
      expect(fieldErrors(response.json())).toHaveProperty('content');
      expect(await app.prisma.tweet.count()).toBe(0);
    });

    it('rejects a missing content field with 400', async () => {
      const cookie = await loginAs(app, await createUser(app.prisma));

      const response = await postTweet({}, cookie);

      expect(response.statusCode).toBe(400);
    });

    it('requires a session', async () => {
      const response = await postTweet({ content: 'hello' });

      expect(response.statusCode).toBe(401);
      expect(await app.prisma.tweet.count()).toBe(0);
    });
  });

  describe('GET /api/tweets/:id', () => {
    it('returns any user’s tweet', async () => {
      const ana = await createUser(app.prisma, { username: 'ana' });
      const tweet = await createTweet(app.prisma, ana, { content: 'first chirp' });
      const cookie = await loginAs(app, await createUser(app.prisma));

      const response = await getTweet(tweet.id, cookie);

      expect(response.statusCode).toBe(200);
      expect(tweetSchema.parse(response.json())).toMatchObject({
        id: tweet.id,
        content: 'first chirp',
        createdAt: tweet.createdAt.toISOString(),
        author: { id: ana.id, username: 'ana' },
      });
    });

    it('reports the like count and whether the viewer liked it', async () => {
      const viewer = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));
      await createLike(app.prisma, await createUser(app.prisma), tweet);
      const cookie = await loginAs(app, viewer);

      expect((await getTweet(tweet.id, cookie)).json()).toMatchObject({
        likeCount: 1,
        likedByMe: false,
      });

      await createLike(app.prisma, viewer, tweet);

      expect((await getTweet(tweet.id, cookie)).json()).toMatchObject({
        likeCount: 2,
        likedByMe: true,
      });
    });

    it('reports the reply count and the chirp a reply answers', async () => {
      const ana = await createUser(app.prisma, { username: 'ana', displayName: 'Ana' });
      const parent = await createTweet(app.prisma, ana);
      const reply = await createTweet(app.prisma, await createUser(app.prisma), {
        parentId: parent.id,
      });
      await createTweet(app.prisma, ana, { parentId: parent.id });
      // A reply to the reply counts towards the reply, not the parent.
      await createTweet(app.prisma, ana, { parentId: reply.id });
      const cookie = await loginAs(app, await createUser(app.prisma));

      expect((await getTweet(parent.id, cookie)).json()).toMatchObject({
        replyCount: 2,
        replyTo: null,
      });
      expect(tweetSchema.parse((await getTweet(reply.id, cookie)).json())).toMatchObject({
        replyCount: 1,
        replyTo: {
          id: parent.id,
          author: { id: ana.id, username: 'ana', displayName: 'Ana', avatarUrl: null },
        },
      });
    });

    it('returns 404 for an unknown tweet', async () => {
      const cookie = await loginAs(app, await createUser(app.prisma));

      const response = await getTweet(UNKNOWN_ID, cookie);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    });

    it('returns 400 for an id that is not a UUID', async () => {
      const cookie = await loginAs(app, await createUser(app.prisma));

      const response = await getTweet('not-a-uuid', cookie);

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    });

    it('requires a session', async () => {
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));

      expect((await getTweet(tweet.id)).statusCode).toBe(401);
    });
  });

  describe('DELETE /api/tweets/:id', () => {
    it('deletes the author’s own tweet', async () => {
      const ana = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, ana);
      const cookie = await loginAs(app, ana);

      const response = await deleteTweet(tweet.id, cookie);

      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');
      expect(await app.prisma.tweet.count()).toBe(0);
      expect((await getTweet(tweet.id, cookie)).statusCode).toBe(404);
    });

    it('returns 403 and keeps the tweet when someone else tries to delete it', async () => {
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));
      const cookie = await loginAs(app, await createUser(app.prisma));

      const response = await deleteTweet(tweet.id, cookie);

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
      expect(await app.prisma.tweet.count()).toBe(1);
    });

    it('returns 404 for an unknown tweet', async () => {
      const cookie = await loginAs(app, await createUser(app.prisma));

      expect((await deleteTweet(UNKNOWN_ID, cookie)).statusCode).toBe(404);
    });

    it('deletes the whole conversation under the chirp, whoever wrote it', async () => {
      const ana = await createUser(app.prisma);
      const bruno = await createUser(app.prisma);
      const root = await createTweet(app.prisma, ana);
      const reply = await createTweet(app.prisma, bruno, { parentId: root.id });
      const nested = await createTweet(app.prisma, ana, { parentId: reply.id });
      await createLike(app.prisma, ana, nested);
      const unrelated = await createTweet(app.prisma, bruno);

      expect((await deleteTweet(root.id, await loginAs(app, ana))).statusCode).toBe(204);

      expect(await app.prisma.tweet.findMany({ select: { id: true } })).toEqual([
        { id: unrelated.id },
      ]);
      expect(await app.prisma.like.count()).toBe(0);
    });

    it('deleting a reply keeps its parent and lowers its reply count', async () => {
      const ana = await createUser(app.prisma);
      const parent = await createTweet(app.prisma, await createUser(app.prisma));
      const reply = await createTweet(app.prisma, ana, { parentId: parent.id });
      const cookie = await loginAs(app, ana);

      expect((await deleteTweet(reply.id, cookie)).statusCode).toBe(204);

      expect((await getTweet(parent.id, cookie)).json()).toMatchObject({ replyCount: 0 });
    });

    it('returns 404 when the tweet was already deleted', async () => {
      const ana = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, ana);
      const cookie = await loginAs(app, ana);
      await deleteTweet(tweet.id, cookie);

      expect((await deleteTweet(tweet.id, cookie)).statusCode).toBe(404);
    });

    it('returns 400 for an id that is not a UUID', async () => {
      const cookie = await loginAs(app, await createUser(app.prisma));

      expect((await deleteTweet('123', cookie)).statusCode).toBe(400);
    });

    it('requires a session', async () => {
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));

      expect((await deleteTweet(tweet.id)).statusCode).toBe(401);
      expect(await app.prisma.tweet.count()).toBe(1);
    });
  });

  describe('POST /api/tweets/:id/replies', () => {
    it('creates a reply by the signed-in user to someone else’s chirp', async () => {
      const ana = await createUser(app.prisma, { username: 'ana', displayName: 'Ana' });
      const bruno = await createUser(app.prisma, { username: 'bruno' });
      const parent = await createTweet(app.prisma, ana);
      const cookie = await loginAs(app, bruno);

      const response = await postReply(parent.id, { content: '  Agreed!  ' }, cookie);

      expect(response.statusCode).toBe(201);
      const reply = tweetSchema.parse(response.json());
      expect(reply).toMatchObject({
        content: 'Agreed!',
        author: { id: bruno.id, username: 'bruno' },
        likeCount: 0,
        likedByMe: false,
        replyCount: 0,
        replyTo: { id: parent.id, author: { id: ana.id, username: 'ana', displayName: 'Ana' } },
      });
      const stored = await app.prisma.tweet.findUniqueOrThrow({ where: { id: reply.id } });
      expect(stored).toMatchObject({ authorId: bruno.id, parentId: parent.id });
      expect((await getTweet(parent.id, cookie)).json()).toMatchObject({ replyCount: 1 });
    });

    it('answers a reply, so conversations nest', async () => {
      const ana = await createUser(app.prisma);
      const root = await createTweet(app.prisma, ana);
      const reply = await createTweet(app.prisma, await createUser(app.prisma), {
        parentId: root.id,
      });

      const response = await postReply(reply.id, { content: 'and more' }, await loginAs(app, ana));

      expect(response.statusCode).toBe(201);
      expect(tweetSchema.parse(response.json()).replyTo?.id).toBe(reply.id);
    });

    it('lets authors reply to their own chirps', async () => {
      const ana = await createUser(app.prisma);
      const parent = await createTweet(app.prisma, ana);

      const response = await postReply(parent.id, { content: '2/2' }, await loginAs(app, ana));

      expect(response.statusCode).toBe(201);
      expect(tweetSchema.parse(response.json())).toMatchObject({
        author: { id: ana.id },
        replyTo: { id: parent.id, author: { id: ana.id } },
      });
    });

    it('ignores a parentId or authorId in the body', async () => {
      const ana = await createUser(app.prisma);
      const bruno = await createUser(app.prisma);
      const parent = await createTweet(app.prisma, bruno);
      const other = await createTweet(app.prisma, bruno);

      const response = await postReply(
        parent.id,
        { content: 'mine', parentId: other.id, authorId: bruno.id },
        await loginAs(app, ana),
      );

      expect(response.statusCode).toBe(201);
      expect(tweetSchema.parse(response.json())).toMatchObject({
        author: { id: ana.id },
        replyTo: { id: parent.id },
      });
    });

    it.each([
      ['empty', ''],
      ['whitespace only', '   \n '],
      ['281 characters', 'a'.repeat(281)],
    ])('rejects %s content with 400', async (_case, content) => {
      const parent = await createTweet(app.prisma, await createUser(app.prisma));
      const cookie = await loginAs(app, await createUser(app.prisma));

      const response = await postReply(parent.id, { content }, cookie);

      expect(response.statusCode).toBe(400);
      expect(fieldErrors(response.json())).toHaveProperty('content');
      expect(await app.prisma.tweet.count()).toBe(1);
    });

    it('returns 404 when the chirp being answered does not exist', async () => {
      const cookie = await loginAs(app, await createUser(app.prisma));

      const response = await postReply(UNKNOWN_ID, { content: 'hello?' }, cookie);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
      expect(await app.prisma.tweet.count()).toBe(0);
    });

    it('returns 400 for an id that is not a UUID', async () => {
      const cookie = await loginAs(app, await createUser(app.prisma));

      const response = await postReply('not-a-uuid', { content: 'hello' }, cookie);

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    });

    it('requires a session', async () => {
      const parent = await createTweet(app.prisma, await createUser(app.prisma));

      const response = await postReply(parent.id, { content: 'hello' });

      expect(response.statusCode).toBe(401);
      expect(await app.prisma.tweet.count()).toBe(1);
    });
  });
});
