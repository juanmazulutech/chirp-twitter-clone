import { likeStateSchema } from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createLike } from '../../../test/factories/likes';
import { createTweet } from '../../../test/factories/tweets';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';

const MISSING_TWEET_ID = '01900000-0000-7000-8000-000000000000';

describe('likes routes', () => {
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

  const send = (method: 'POST' | 'DELETE', tweetId: string, cookie?: string) =>
    app.inject({ method, url: `/api/tweets/${tweetId}/like`, headers: cookie ? { cookie } : {} });
  const like = (tweetId: string, cookie?: string) => send('POST', tweetId, cookie);
  const unlike = (tweetId: string, cookie?: string) => send('DELETE', tweetId, cookie);

  const errorCode = (body: unknown) => (body as { error: { code: string } }).error.code;
  const likeRows = () => app.prisma.like.findMany({ select: { userId: true, tweetId: true } });

  describe('POST /api/tweets/:id/like', () => {
    it('likes the tweet and returns the new like state', async () => {
      const ana = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));

      const response = await like(tweet.id, await loginAs(app, ana));

      expect(response.statusCode).toBe(200);
      expect(likeStateSchema.parse(response.json())).toEqual({ liked: true, likeCount: 1 });
      expect(await likeRows()).toEqual([{ userId: ana.id, tweetId: tweet.id }]);
    });

    it('counts every like on the tweet, not only the viewer', async () => {
      const ana = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));
      await createLike(app.prisma, await createUser(app.prisma), tweet);

      const response = await like(tweet.id, await loginAs(app, ana));

      expect(response.json()).toEqual({ liked: true, likeCount: 2 });
    });

    it('lets authors like their own tweets', async () => {
      const ana = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, ana);

      const response = await like(tweet.id, await loginAs(app, ana));

      expect(response.json()).toEqual({ liked: true, likeCount: 1 });
    });

    it('is idempotent: liking twice keeps a single like', async () => {
      const ana = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));
      const cookie = await loginAs(app, ana);

      await like(tweet.id, cookie);
      const response = await like(tweet.id, cookie);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ liked: true, likeCount: 1 });
      expect(await app.prisma.like.count()).toBe(1);
    });

    it('survives concurrent likes of the same tweet', async () => {
      const ana = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));
      const cookie = await loginAs(app, ana);

      const responses = await Promise.all([like(tweet.id, cookie), like(tweet.id, cookie)]);

      expect(responses.map((response) => response.statusCode)).toEqual([200, 200]);
      expect(await app.prisma.like.count()).toBe(1);
    });

    it('returns 404 for a tweet that does not exist', async () => {
      const ana = await createUser(app.prisma);

      const response = await like(MISSING_TWEET_ID, await loginAs(app, ana));

      expect(response.statusCode).toBe(404);
      expect(errorCode(response.json())).toBe('NOT_FOUND');
    });

    it('returns 400 for an id that is not a UUID', async () => {
      const ana = await createUser(app.prisma);

      const response = await like('not-a-uuid', await loginAs(app, ana));

      expect(response.statusCode).toBe(400);
      expect(errorCode(response.json())).toBe('VALIDATION_ERROR');
    });

    it('returns 401 without a session', async () => {
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));

      const response = await like(tweet.id);

      expect(response.statusCode).toBe(401);
      expect(await app.prisma.like.count()).toBe(0);
    });
  });

  describe('DELETE /api/tweets/:id/like', () => {
    it('unlikes the tweet and returns the new like state', async () => {
      const ana = await createUser(app.prisma);
      const carla = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));
      await createLike(app.prisma, ana, tweet);
      await createLike(app.prisma, carla, tweet);

      const response = await unlike(tweet.id, await loginAs(app, ana));

      expect(response.statusCode).toBe(200);
      expect(likeStateSchema.parse(response.json())).toEqual({ liked: false, likeCount: 1 });
      expect(await likeRows()).toEqual([{ userId: carla.id, tweetId: tweet.id }]);
    });

    it('is idempotent: unliking a tweet not liked succeeds', async () => {
      const ana = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));

      const response = await unlike(tweet.id, await loginAs(app, ana));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ liked: false, likeCount: 0 });
    });

    it('returns 404 for a tweet that does not exist', async () => {
      const ana = await createUser(app.prisma);

      const response = await unlike(MISSING_TWEET_ID, await loginAs(app, ana));

      expect(response.statusCode).toBe(404);
    });

    it('returns 401 without a session', async () => {
      const ana = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));
      await createLike(app.prisma, ana, tweet);

      const response = await unlike(tweet.id);

      expect(response.statusCode).toBe(401);
      expect(await app.prisma.like.count()).toBe(1);
    });
  });

  it('deleting a tweet removes its likes', async () => {
    const ana = await createUser(app.prisma);
    const tweet = await createTweet(app.prisma, ana);
    await createLike(app.prisma, await createUser(app.prisma), tweet);

    await app.inject({
      method: 'DELETE',
      url: `/api/tweets/${tweet.id}`,
      headers: { cookie: await loginAs(app, ana) },
    });

    expect(await app.prisma.like.count()).toBe(0);
  });
});
