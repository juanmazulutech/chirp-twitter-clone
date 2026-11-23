import { pageSchema, THREAD_ANCESTORS_MAX, tweetAncestorsSchema, tweetSchema } from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createLike } from '../../../test/factories/likes';
import { createTweet } from '../../../test/factories/tweets';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import type { Tweet, User } from '../../generated/prisma/client';
import { encodeCursor } from '../../lib/cursor';

const UNKNOWN_ID = '019a0000-0000-7000-8000-000000000000';
const repliesPage = pageSchema(tweetSchema);

describe('threads', () => {
  let app: App;
  let viewer: User;
  let cookie: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app.prisma);
    viewer = await createUser(app.prisma);
    cookie = await loginAs(app, viewer);
  });

  afterAll(async () => {
    await app.close();
  });

  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
  const replyTo = (parent: Pick<Tweet, 'id'>, author: Pick<User, 'id'>, minutes: number) =>
    createTweet(app.prisma, author, { parentId: parent.id, createdAt: minutesAgo(minutes) });

  const getReplies = (id: string, query: Record<string, string> = {}, session = cookie) =>
    app.inject({
      method: 'GET',
      url: `/api/tweets/${id}/replies`,
      query,
      headers: session ? { cookie: session } : {},
    });
  const getAncestors = (id: string, session = cookie) =>
    app.inject({
      method: 'GET',
      url: `/api/tweets/${id}/ancestors`,
      headers: session ? { cookie: session } : {},
    });

  const fetchReplies = async (id: string, query: Record<string, string> = {}) => {
    const response = await getReplies(id, query);
    expect(response.statusCode).toBe(200);
    return repliesPage.parse(response.json());
  };

  describe('GET /api/tweets/:id/replies', () => {
    it('lists direct replies oldest first, with counts and the viewer’s likes', async () => {
      const root = await createTweet(app.prisma, await createUser(app.prisma));
      const first = await replyTo(root, viewer, 30);
      const second = await replyTo(root, await createUser(app.prisma), 20);
      // A reply to a reply belongs to its own thread page.
      const nested = await replyTo(first, viewer, 10);
      await createLike(app.prisma, viewer, second);

      const page = await fetchReplies(root.id);

      expect(
        page.items.map(({ id, likedByMe, replyCount, replyTo: to }) => ({
          id,
          likedByMe,
          replyCount,
          parent: to?.id,
        })),
      ).toEqual([
        { id: first.id, likedByMe: false, replyCount: 1, parent: root.id },
        { id: second.id, likedByMe: true, replyCount: 0, parent: root.id },
      ]);
      expect(page.items.map((tweet) => tweet.id)).not.toContain(nested.id);
      expect(page.nextCursor).toBeNull();
    });

    it('returns an empty last page for a chirp without replies', async () => {
      const root = await createTweet(app.prisma, viewer);

      expect(await fetchReplies(root.id)).toEqual({ items: [], nextCursor: null });
    });

    it('walks every page without duplicates or gaps', async () => {
      const root = await createTweet(app.prisma, viewer);
      const created = [];
      for (let minutes = 5; minutes >= 1; minutes -= 1) {
        created.push(await replyTo(root, viewer, minutes));
      }

      const ids: string[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const page = await fetchReplies(root.id, { limit: '2', ...(cursor ? { cursor } : {}) });
        ids.push(...page.items.map((tweet) => tweet.id));
        cursor = page.nextCursor;
        pages += 1;
      } while (cursor && pages < 10);

      expect(ids).toEqual(created.map((tweet) => tweet.id));
      expect(pages).toBe(3);
    });

    it('ends without an empty extra page when the last page is exactly full', async () => {
      const root = await createTweet(app.prisma, viewer);
      await replyTo(root, viewer, 2);
      await replyTo(root, viewer, 1);

      const page = await fetchReplies(root.id, { limit: '2' });

      expect(page.items).toHaveLength(2);
      expect(page.nextCursor).toBeNull();
    });

    it('breaks ties between equal timestamps by id, across page boundaries', async () => {
      const root = await createTweet(app.prisma, viewer);
      const at = minutesAgo(5);
      const replies = [];
      for (let index = 0; index < 3; index += 1) {
        replies.push(await createTweet(app.prisma, viewer, { parentId: root.id, createdAt: at }));
      }
      const ascending = replies.map((tweet) => tweet.id).sort();

      const first = await fetchReplies(root.id, { limit: '2' });
      const second = await fetchReplies(root.id, { limit: '2', cursor: first.nextCursor ?? '' });

      expect([...first.items, ...second.items].map((tweet) => tweet.id)).toEqual(ascending);
    });

    it('continues after a cursor whose reply was deleted', async () => {
      const root = await createTweet(app.prisma, viewer);
      const gone = await replyTo(root, viewer, 3);
      const next = await replyTo(root, viewer, 2);
      await app.prisma.tweet.delete({ where: { id: gone.id } });

      const page = await fetchReplies(root.id, { cursor: encodeCursor(gone) });

      expect(page.items.map((tweet) => tweet.id)).toEqual([next.id]);
    });

    it('returns 400 for a malformed cursor, even on an unknown chirp', async () => {
      const response = await getReplies(UNKNOWN_ID, { cursor: 'not-a-cursor' });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          details: { fieldErrors: { cursor: expect.any(Array) } },
        },
      });
    });

    it.each(['0', '51'])('returns 400 for limit=%s', async (limit) => {
      const root = await createTweet(app.prisma, viewer);

      expect((await getReplies(root.id, { limit })).statusCode).toBe(400);
    });

    it('returns 404 for an unknown chirp', async () => {
      const response = await getReplies(UNKNOWN_ID);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    });

    it('returns 400 for an id that is not a UUID', async () => {
      expect((await getReplies('nope')).statusCode).toBe(400);
    });

    it('requires a session', async () => {
      const root = await createTweet(app.prisma, viewer);

      expect((await getReplies(root.id, {}, '')).statusCode).toBe(401);
    });
  });

  describe('GET /api/tweets/:id/ancestors', () => {
    it('returns the chirps above a reply, root first', async () => {
      const ana = await createUser(app.prisma, { username: 'ana' });
      const root = await createTweet(app.prisma, ana, { createdAt: minutesAgo(40) });
      const middle = await replyTo(root, viewer, 30);
      const parent = await replyTo(middle, ana, 20);
      const reply = await replyTo(parent, viewer, 10);
      await createLike(app.prisma, viewer, root);

      const response = await getAncestors(reply.id);

      expect(response.statusCode).toBe(200);
      const { items } = tweetAncestorsSchema.parse(response.json());
      expect(items.map((tweet) => tweet.id)).toEqual([root.id, middle.id, parent.id]);
      expect(items[0]).toMatchObject({
        author: { username: 'ana' },
        likedByMe: true,
        replyCount: 1,
        replyTo: null,
      });
    });

    it('is empty for a top-level chirp', async () => {
      const root = await createTweet(app.prisma, viewer);

      expect(tweetAncestorsSchema.parse((await getAncestors(root.id)).json())).toEqual({
        items: [],
      });
    });

    it(`stops at the ${THREAD_ANCESTORS_MAX} nearest ancestors`, async () => {
      let parent = await createTweet(app.prisma, viewer, { createdAt: minutesAgo(100) });
      const chain = [parent];
      for (let depth = 1; depth <= THREAD_ANCESTORS_MAX + 2; depth += 1) {
        parent = await replyTo(parent, viewer, 100 - depth);
        chain.push(parent);
      }
      const deepest = chain.at(-1);
      if (!deepest) throw new Error('empty chain');

      const { items } = tweetAncestorsSchema.parse((await getAncestors(deepest.id)).json());

      const expected = chain.slice(-THREAD_ANCESTORS_MAX - 1, -1).map((tweet) => tweet.id);
      expect(items.map((tweet) => tweet.id)).toEqual(expected);
      // The topmost one still says what it answers, so the client can keep climbing.
      expect(items[0]?.replyTo?.id).toBe(chain.at(-THREAD_ANCESTORS_MAX - 2)?.id);
    });

    it('returns 404 for an unknown chirp', async () => {
      const response = await getAncestors(UNKNOWN_ID);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    });

    it('returns 400 for an id that is not a UUID', async () => {
      expect((await getAncestors('nope')).statusCode).toBe(400);
    });

    it('requires a session', async () => {
      const root = await createTweet(app.prisma, viewer);

      expect((await getAncestors(root.id, '')).statusCode).toBe(401);
    });
  });

  it('deleting an ancestor removes the branch below it', async () => {
    const root = await createTweet(app.prisma, viewer);
    const middle = await replyTo(root, viewer, 2);
    const reply = await replyTo(middle, viewer, 1);

    await app.prisma.tweet.delete({ where: { id: middle.id } });

    expect((await getAncestors(reply.id)).statusCode).toBe(404);
    expect((await fetchReplies(root.id)).items).toEqual([]);
  });
});
