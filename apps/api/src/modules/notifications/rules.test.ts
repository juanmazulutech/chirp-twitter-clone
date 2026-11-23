import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createFollow } from '../../../test/factories/follows';
import { createLike } from '../../../test/factories/likes';
import { createNotification } from '../../../test/factories/notifications';
import { createTweet } from '../../../test/factories/tweets';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import { isUniqueViolation } from '../../lib/prisma-errors';
import { notifyFollow } from './rules';

/** The rules of ADR-15, exercised through the endpoints whose actions notify. */
describe('notification rules', () => {
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

  const inject = (method: 'POST' | 'DELETE', url: string, cookie: string, payload?: object) =>
    app.inject({ method, url: `/api${url}`, headers: { cookie }, payload });
  const follow = (username: string, cookie: string) =>
    inject('POST', `/users/${username}/follow`, cookie);
  const unfollow = (username: string, cookie: string) =>
    inject('DELETE', `/users/${username}/follow`, cookie);
  const like = (tweetId: string, cookie: string) =>
    inject('POST', `/tweets/${tweetId}/like`, cookie);
  const unlike = (tweetId: string, cookie: string) =>
    inject('DELETE', `/tweets/${tweetId}/like`, cookie);
  const reply = (parentId: string, cookie: string) =>
    inject('POST', `/tweets/${parentId}/replies`, cookie, { content: 'A reply' });
  const removeTweet = (tweetId: string, cookie: string) =>
    inject('DELETE', `/tweets/${tweetId}`, cookie);

  const notifications = () =>
    app.prisma.notification.findMany({
      select: { type: true, recipientId: true, actorId: true, tweetId: true, readAt: true },
      orderBy: { id: 'asc' },
    });

  describe('follow', () => {
    it('notifies the followed user', async () => {
      const ana = await createUser(app.prisma);
      const ben = await createUser(app.prisma);

      expect((await follow(ben.username, await loginAs(app, ana))).statusCode).toBe(200);

      expect(await notifications()).toEqual([
        { type: 'FOLLOW', recipientId: ben.id, actorId: ana.id, tweetId: null, readAt: null },
      ]);
    });

    it('notifies once when the follow is repeated', async () => {
      const ben = await createUser(app.prisma);
      const cookie = await loginAs(app, await createUser(app.prisma));

      await follow(ben.username, cookie);
      await follow(ben.username, cookie);

      expect(await notifications()).toHaveLength(1);
    });

    it('notifies once when the same follow arrives concurrently', async () => {
      const ben = await createUser(app.prisma);
      const cookie = await loginAs(app, await createUser(app.prisma));

      const responses = await Promise.all([
        follow(ben.username, cookie),
        follow(ben.username, cookie),
      ]);

      expect(responses.map((response) => response.statusCode)).toEqual([200, 200]);
      expect(await notifications()).toHaveLength(1);
    });

    it('does not notify on a rejected self-follow', async () => {
      const ana = await createUser(app.prisma);

      expect((await follow(ana.username, await loginAs(app, ana))).statusCode).toBe(400);

      expect(await notifications()).toEqual([]);
    });

    it('deletes the notification on unfollow, and a new follow notifies again unread', async () => {
      const ana = await createUser(app.prisma);
      const ben = await createUser(app.prisma);
      const cookie = await loginAs(app, ana);
      await follow(ben.username, cookie);
      await app.prisma.notification.updateMany({ data: { readAt: new Date() } });

      await unfollow(ben.username, cookie);
      expect(await notifications()).toEqual([]);

      await follow(ben.username, cookie);
      expect(await notifications()).toEqual([
        expect.objectContaining({ type: 'FOLLOW', readAt: null }),
      ]);
    });

    it('unfollowing only deletes that follower’s notification', async () => {
      const ben = await createUser(app.prisma);
      const ana = await createUser(app.prisma);
      const cleo = await createUser(app.prisma);
      await createFollow(app.prisma, cleo, ben);
      await createNotification(app.prisma, ben, cleo);
      await createFollow(app.prisma, ana, ben);
      await createNotification(app.prisma, ben, ana);

      await unfollow(ben.username, await loginAs(app, ana));

      expect(await notifications()).toEqual([expect.objectContaining({ actorId: cleo.id })]);
    });
  });

  describe('like', () => {
    it('notifies the tweet’s author about that tweet', async () => {
      const ana = await createUser(app.prisma);
      const ben = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, ben);

      expect((await like(tweet.id, await loginAs(app, ana))).statusCode).toBe(200);

      expect(await notifications()).toEqual([
        { type: 'LIKE', recipientId: ben.id, actorId: ana.id, tweetId: tweet.id, readAt: null },
      ]);
    });

    it('does not notify authors who like their own tweet', async () => {
      const ana = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, ana);

      expect((await like(tweet.id, await loginAs(app, ana))).statusCode).toBe(200);

      expect(await notifications()).toEqual([]);
    });

    it('notifies once when the like is repeated or concurrent', async () => {
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));
      const cookie = await loginAs(app, await createUser(app.prisma));

      await like(tweet.id, cookie);
      await Promise.all([like(tweet.id, cookie), like(tweet.id, cookie)]);

      expect(await notifications()).toHaveLength(1);
    });

    it('notifies separately for each liked tweet', async () => {
      const ben = await createUser(app.prisma);
      const first = await createTweet(app.prisma, ben);
      const second = await createTweet(app.prisma, ben);
      const cookie = await loginAs(app, await createUser(app.prisma));

      await like(first.id, cookie);
      await like(second.id, cookie);

      expect((await notifications()).map((row) => row.tweetId)).toEqual([first.id, second.id]);
    });

    it('deletes only the unliking user’s notification', async () => {
      const ben = await createUser(app.prisma);
      const ana = await createUser(app.prisma);
      const cleo = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, ben);
      await createLike(app.prisma, cleo, tweet);
      await createNotification(app.prisma, ben, cleo, { tweet });
      const cookie = await loginAs(app, ana);
      await like(tweet.id, cookie);

      expect((await unlike(tweet.id, cookie)).statusCode).toBe(200);

      expect(await notifications()).toEqual([expect.objectContaining({ actorId: cleo.id })]);
    });

    it('leaves nothing behind when the like fails on a missing tweet', async () => {
      const cookie = await loginAs(app, await createUser(app.prisma));

      const response = await like('01900000-0000-7000-8000-000000000000', cookie);

      expect(response.statusCode).toBe(404);
      expect(await notifications()).toEqual([]);
    });
  });

  describe('reply', () => {
    it('notifies the parent’s author, pointing at the reply', async () => {
      const ana = await createUser(app.prisma);
      const ben = await createUser(app.prisma);
      const parent = await createTweet(app.prisma, ben);

      const response = await reply(parent.id, await loginAs(app, ana));

      expect(response.statusCode).toBe(201);
      const replyId = response.json<{ id: string }>().id;
      expect(await notifications()).toEqual([
        { type: 'REPLY', recipientId: ben.id, actorId: ana.id, tweetId: replyId, readAt: null },
      ]);
    });

    it('does not notify authors who reply to themselves', async () => {
      const ana = await createUser(app.prisma);
      const parent = await createTweet(app.prisma, ana);

      expect((await reply(parent.id, await loginAs(app, ana))).statusCode).toBe(201);

      expect(await notifications()).toEqual([]);
    });

    it('notifies each reply separately', async () => {
      const parent = await createTweet(app.prisma, await createUser(app.prisma));
      const cookie = await loginAs(app, await createUser(app.prisma));

      await reply(parent.id, cookie);
      await reply(parent.id, cookie);

      expect(await notifications()).toHaveLength(2);
    });

    it('notifies only the direct parent’s author, not the rest of the thread', async () => {
      const ana = await createUser(app.prisma);
      const ben = await createUser(app.prisma);
      const cleo = await createUser(app.prisma);
      const root = await createTweet(app.prisma, ana);
      const middle = await createTweet(app.prisma, ben, { parentId: root.id });

      await reply(middle.id, await loginAs(app, cleo));

      expect(await notifications()).toEqual([
        expect.objectContaining({ type: 'REPLY', recipientId: ben.id, actorId: cleo.id }),
      ]);
    });
  });

  describe('deleting a chirp', () => {
    it('removes the notifications about likes on it', async () => {
      const ben = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, ben);
      await like(tweet.id, await loginAs(app, await createUser(app.prisma)));

      expect((await removeTweet(tweet.id, await loginAs(app, ben))).statusCode).toBe(204);

      expect(await notifications()).toEqual([]);
    });

    it('removes the notification about a reply, also when its parent is deleted', async () => {
      const ana = await createUser(app.prisma);
      const ben = await createUser(app.prisma);
      const anaCookie = await loginAs(app, ana);
      const parent = await createTweet(app.prisma, ben);
      const first = (await reply(parent.id, anaCookie)).json<{ id: string }>();
      await reply(parent.id, anaCookie);

      await removeTweet(first.id, anaCookie);
      expect(await notifications()).toHaveLength(1);

      await removeTweet(parent.id, await loginAs(app, ben));
      expect(await notifications()).toEqual([]);
    });
  });

  describe('database constraints', () => {
    const rejection = (promise: Promise<unknown>) =>
      promise.then(
        () => undefined,
        (error: unknown) => error,
      );

    it('rejects a second notification for the same follow', async () => {
      const ana = await createUser(app.prisma);
      const ben = await createUser(app.prisma);
      await createNotification(app.prisma, ben, ana);

      const error = await rejection(createNotification(app.prisma, ben, ana));

      expect(isUniqueViolation(error)).toBe(true);
    });

    it('skips a self-follow even when a caller did not reject it first', async () => {
      const ana = await createUser(app.prisma);

      await notifyFollow(app.prisma, { followerId: ana.id, followingId: ana.id });

      expect(await notifications()).toEqual([]);
    });

    it('rejects a self-notification and a FOLLOW about a tweet', async () => {
      const ana = await createUser(app.prisma);
      const ben = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, ana);

      await expect(createNotification(app.prisma, ana, ana)).rejects.toThrow();
      await expect(
        createNotification(app.prisma, ana, ben, { tweet, type: 'FOLLOW' }),
      ).rejects.toThrow();
      await expect(createNotification(app.prisma, ana, ben, { type: 'LIKE' })).rejects.toThrow();
    });
  });
});
