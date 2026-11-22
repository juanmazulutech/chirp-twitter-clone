import { pageSchema, tweetSchema } from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createFollow } from '../../../test/factories/follows';
import { createTweet } from '../../../test/factories/tweets';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import type { User } from '../../generated/prisma/client';
import { encodeCursor } from '../../lib/cursor';

const timelinePage = pageSchema(tweetSchema);

describe('GET /api/timeline', () => {
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

  const getTimeline = (cookie?: string, query: Record<string, string> = {}) =>
    app.inject({ method: 'GET', url: '/api/timeline', query, headers: cookie ? { cookie } : {} });

  const fetchPage = async (cookie: string, query: Record<string, string> = {}) => {
    const response = await getTimeline(cookie, query);
    expect(response.statusCode).toBe(200);
    return timelinePage.parse(response.json());
  };

  /** Follows `nextCursor` until the last page and returns every tweet id in order. */
  const fetchAllIds = async (cookie: string, limit: number) => {
    const ids: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await fetchPage(cookie, { limit: String(limit), ...(cursor ? { cursor } : {}) });
      ids.push(...page.items.map((tweet) => tweet.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor && pages < 100);
    return { ids, pages };
  };

  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
  const tweetAt = (author: Pick<User, 'id'>, minutes: number) =>
    createTweet(app.prisma, author, { createdAt: minutesAgo(minutes) });

  it("shows the viewer's own tweets and those of people they follow, newest first", async () => {
    const ana = await createUser(app.prisma);
    const bruno = await createUser(app.prisma, { username: 'bruno' });
    const stranger = await createUser(app.prisma);
    await createFollow(app.prisma, ana, bruno);
    const old = await tweetAt(ana, 30);
    const recent = await tweetAt(bruno, 10);
    const middle = await tweetAt(bruno, 20);
    await tweetAt(stranger, 5);

    const page = await fetchPage(await loginAs(app, ana));

    expect(page.items.map((tweet) => tweet.id)).toEqual([recent.id, middle.id, old.id]);
    expect(page.items[0]?.author.username).toBe('bruno');
    expect(page.nextCursor).toBeNull();
  });

  it('does not show tweets of people who follow the viewer', async () => {
    const ana = await createUser(app.prisma);
    const fan = await createUser(app.prisma);
    await createFollow(app.prisma, fan, ana);
    await tweetAt(fan, 1);

    expect((await fetchPage(await loginAs(app, ana))).items).toEqual([]);
  });

  it('reflects a follow and an unfollow immediately', async () => {
    const ana = await createUser(app.prisma);
    const bruno = await createUser(app.prisma, { username: 'bruno' });
    await tweetAt(bruno, 1);
    const cookie = await loginAs(app, ana);

    await app.inject({ method: 'POST', url: '/api/users/bruno/follow', headers: { cookie } });
    expect((await fetchPage(cookie)).items).toHaveLength(1);

    await app.inject({ method: 'DELETE', url: '/api/users/bruno/follow', headers: { cookie } });
    expect((await fetchPage(cookie)).items).toHaveLength(0);
  });

  it('returns an empty last page for a new account', async () => {
    const page = await fetchPage(await loginAs(app, await createUser(app.prisma)));

    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it('defaults to 20 tweets per page', async () => {
    const ana = await createUser(app.prisma);
    for (let minute = 1; minute <= 21; minute += 1) await tweetAt(ana, minute);

    const page = await fetchPage(await loginAs(app, ana));

    expect(page.items).toHaveLength(20);
    expect(page.nextCursor).not.toBeNull();
  });

  it('walks every page without duplicates or gaps', async () => {
    const ana = await createUser(app.prisma);
    const bruno = await createUser(app.prisma);
    await createFollow(app.prisma, ana, bruno);
    const tweets = [];
    for (let minute = 1; minute <= 7; minute += 1) {
      tweets.push(await tweetAt(minute % 2 ? ana : bruno, minute));
    }

    const { ids, pages } = await fetchAllIds(await loginAs(app, ana), 3);

    expect(pages).toBe(3);
    expect(ids).toEqual(tweets.map((tweet) => tweet.id));
  });

  it('ends without an empty extra page when the last page is exactly full', async () => {
    const ana = await createUser(app.prisma);
    for (let minute = 1; minute <= 4; minute += 1) await tweetAt(ana, minute);

    const { ids, pages } = await fetchAllIds(await loginAs(app, ana), 2);

    expect(ids).toHaveLength(4);
    expect(pages).toBe(2);
  });

  it('breaks ties between equal timestamps by id, across page boundaries', async () => {
    const ana = await createUser(app.prisma);
    const sameInstant = minutesAgo(5);
    const tied = [];
    for (let n = 0; n < 5; n += 1) {
      tied.push(await createTweet(app.prisma, ana, { createdAt: sameInstant }));
    }
    const older = await tweetAt(ana, 10);

    const { ids } = await fetchAllIds(await loginAs(app, ana), 2);

    const tiedIdsDescending = tied
      .map((tweet) => tweet.id)
      .sort()
      .reverse();
    expect(ids).toEqual([...tiedIdsDescending, older.id]);
  });

  it('keeps only followed authors on later pages', async () => {
    // Regression guard: the cursor's OR must not replace the timeline's own OR filter.
    const ana = await createUser(app.prisma);
    const stranger = await createUser(app.prisma);
    for (let minute = 1; minute <= 4; minute += 1) {
      await tweetAt(ana, minute * 2);
      await tweetAt(stranger, minute * 2 + 1);
    }

    const { ids } = await fetchAllIds(await loginAs(app, ana), 1);

    const authors = await app.prisma.tweet.findMany({
      where: { id: { in: ids } },
      select: { authorId: true },
    });
    expect(ids).toHaveLength(4);
    expect(new Set(authors.map((tweet) => tweet.authorId))).toEqual(new Set([ana.id]));
  });

  it('continues after a cursor whose tweet was deleted', async () => {
    const ana = await createUser(app.prisma);
    const tweets = [];
    for (let minute = 1; minute <= 4; minute += 1) tweets.push(await tweetAt(ana, minute));
    const cookie = await loginAs(app, ana);
    const first = await fetchPage(cookie, { limit: '2' });
    await app.prisma.tweet.delete({ where: { id: tweets[1]?.id } });

    const second = await fetchPage(cookie, { limit: '2', cursor: first.nextCursor ?? '' });

    expect(second.items.map((tweet) => tweet.id)).toEqual([tweets[2]?.id, tweets[3]?.id]);
  });

  it('accepts a well-formed cursor that points past every tweet', async () => {
    const ana = await createUser(app.prisma);
    await tweetAt(ana, 1);
    const cursor = encodeCursor({
      createdAt: new Date('2000-01-01T00:00:00.000Z'),
      id: '019a0000-0000-7000-8000-000000000000',
    });

    const page = await fetchPage(await loginAs(app, ana), { cursor });

    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it.each(['garbage', Buffer.from('2026-11-21T00:00:00.000Z|not-a-uuid').toString('base64url')])(
    'rejects a malformed cursor %j with 400',
    async (cursor) => {
      const response = await getTimeline(await loginAs(app, await createUser(app.prisma)), {
        cursor,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          details: { fieldErrors: { cursor: ['Invalid cursor'] } },
        },
      });
    },
  );

  it.each(['0', '51', 'abc'])('rejects limit=%s with 400', async (limit) => {
    const response = await getTimeline(await loginAs(app, await createUser(app.prisma)), {
      limit,
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 401 without a session', async () => {
    expect((await getTimeline()).statusCode).toBe(401);
  });
});
