import { followListUserSchema, pageSchema } from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createFollow } from '../../../test/factories/follows';
import { createTweet } from '../../../test/factories/tweets';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import type { Tweet, User } from '../../generated/prisma/client';

const likersPage = pageSchema(followListUserSchema);
const MISSING_TWEET_ID = '01900000-0000-7000-8000-000000000000';
const BASE_TIME = new Date('2026-11-20T12:00:00.000Z').getTime();

describe('GET /api/tweets/:id/likes', () => {
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

  const getLikers = (tweetId: string, cookie?: string, query: Record<string, string> = {}) =>
    app.inject({
      method: 'GET',
      url: `/api/tweets/${tweetId}/likes`,
      query,
      headers: cookie ? { cookie } : {},
    });

  /** `user` likes `tweet`, `minutes` after the base time. */
  const likeAt = (user: Pick<User, 'id'>, tweet: Pick<Tweet, 'id'>, minutes: number) =>
    app.prisma.like.create({
      data: {
        userId: user.id,
        tweetId: tweet.id,
        createdAt: new Date(BASE_TIME + minutes * 60_000),
      },
    });

  it('lists who liked the chirp, most recent like first, with whether the viewer follows them', async () => {
    const viewer = await createUser(app.prisma);
    const tweet = await createTweet(app.prisma, await createUser(app.prisma));
    const ana = await createUser(app.prisma, { displayName: 'Ana' });
    const ben = await createUser(app.prisma, { displayName: 'Ben' });
    await likeAt(ana, tweet, 1);
    await likeAt(ben, tweet, 2);
    await createFollow(app.prisma, viewer, ana);

    const response = await getLikers(tweet.id, await loginAs(app, viewer));

    expect(response.statusCode).toBe(200);
    const page = likersPage.parse(response.json());
    expect(page.nextCursor).toBeNull();
    expect(
      page.items.map(({ displayName, isFollowing }) => ({ displayName, isFollowing })),
    ).toEqual([
      { displayName: 'Ben', isFollowing: false },
      { displayName: 'Ana', isFollowing: true },
    ]);
  });

  it('lists only that chirp’s likes', async () => {
    const author = await createUser(app.prisma);
    const tweet = await createTweet(app.prisma, author);
    const other = await createTweet(app.prisma, author);
    await likeAt(await createUser(app.prisma), other, 1);

    const response = await getLikers(tweet.id, await loginAs(app, author));

    expect(likersPage.parse(response.json())).toEqual({ items: [], nextCursor: null });
  });

  it('pages without gaps or duplicates, breaking timestamp ties by user id', async () => {
    const tweet = await createTweet(app.prisma, await createUser(app.prisma));
    const likers: User[] = [];
    for (let i = 0; i < 5; i += 1) {
      const user = await createUser(app.prisma);
      likers.push(user);
      await likeAt(user, tweet, i < 3 ? 0 : i);
    }
    const cookie = await loginAs(app, await createUser(app.prisma));

    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const query: Record<string, string> = cursor ? { limit: '2', cursor } : { limit: '2' };
      const page = likersPage.parse((await getLikers(tweet.id, cookie, query)).json());
      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    const tied = likers
      .slice(0, 3)
      .map((user) => user.id)
      .sort()
      .reverse();
    expect(seen).toEqual([likers[4]?.id, likers[3]?.id, ...tied]);
  });

  it('returns 404 for a chirp that does not exist', async () => {
    const response = await getLikers(
      MISSING_TWEET_ID,
      await loginAs(app, await createUser(app.prisma)),
    );

    expect(response.statusCode).toBe(404);
  });

  it.each([
    ['an id that is not a UUID', 'not-a-uuid', {}],
    ['a malformed cursor', MISSING_TWEET_ID, { cursor: 'garbage' }],
    ['limit=0', MISSING_TWEET_ID, { limit: '0' }],
  ])('returns 400 for %s', async (_case, tweetId, query) => {
    const response = await getLikers(
      tweetId,
      await loginAs(app, await createUser(app.prisma)),
      query,
    );

    expect(response.statusCode).toBe(400);
  });

  it('returns 401 without a session', async () => {
    const tweet = await createTweet(app.prisma, await createUser(app.prisma));

    expect((await getLikers(tweet.id)).statusCode).toBe(401);
  });
});
