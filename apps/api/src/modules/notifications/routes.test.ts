import { notificationSchema, pageSchema, unreadCountSchema } from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createNotification } from '../../../test/factories/notifications';
import { createTweet } from '../../../test/factories/tweets';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import type { User } from '../../generated/prisma/client';

const notificationPage = pageSchema(notificationSchema);
const BASE_TIME = new Date('2026-11-20T12:00:00.000Z').getTime();
const minutesAfterBase = (minutes: number) => new Date(BASE_TIME + minutes * 60_000);

describe('notifications routes', () => {
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
  const list = (cookie?: string, query: Record<string, string> = {}) =>
    app.inject({ method: 'GET', url: '/api/notifications', query, headers: headers(cookie) });
  const unreadCount = (cookie?: string) =>
    app.inject({ method: 'GET', url: '/api/notifications/unread-count', headers: headers(cookie) });
  const markRead = (cookie?: string, payload?: object) =>
    app.inject({
      method: 'POST',
      url: '/api/notifications/read',
      payload,
      headers: headers(cookie),
    });

  /** A FOLLOW from a new user to `recipient`, created `minutes` after the base time. */
  const followAt = async (recipient: User, minutes: number) =>
    createNotification(app.prisma, recipient, await createUser(app.prisma), {
      createdAt: minutesAfterBase(minutes),
    });

  describe('GET /api/notifications', () => {
    it('returns each kind with its actor and chirp, newest first', async () => {
      const ben = await createUser(app.prisma);
      const ana = await createUser(app.prisma, { avatarKey: 'users/ana/avatar/a.png' });
      const liked = await createTweet(app.prisma, ben, { content: 'Liked chirp' });
      const answer = await createTweet(app.prisma, ana, {
        content: 'My answer',
        parentId: liked.id,
      });
      await createNotification(app.prisma, ben, ana, { createdAt: minutesAfterBase(1) });
      await createNotification(app.prisma, ben, ana, {
        tweet: liked,
        createdAt: minutesAfterBase(2),
        readAt: minutesAfterBase(5),
      });
      await createNotification(app.prisma, ben, ana, {
        tweet: answer,
        type: 'REPLY',
        createdAt: minutesAfterBase(3),
      });

      const response = await list(await loginAs(app, ben));

      expect(response.statusCode).toBe(200);
      const page = notificationPage.parse(response.json());
      expect(page.nextCursor).toBeNull();
      expect(page.items.map(({ type, tweet, readAt }) => ({ type, tweet, readAt }))).toEqual([
        { type: 'REPLY', tweet: { id: answer.id, content: 'My answer' }, readAt: null },
        {
          type: 'LIKE',
          tweet: { id: liked.id, content: 'Liked chirp' },
          readAt: minutesAfterBase(5).toISOString(),
        },
        { type: 'FOLLOW', tweet: null, readAt: null },
      ]);
      expect(page.items[0]?.actor).toMatchObject({
        id: ana.id,
        username: ana.username,
        avatarUrl: expect.stringContaining('users/ana/avatar/a.png') as unknown,
      });
    });

    it('lists only the signed-in user’s own notifications', async () => {
      const ana = await createUser(app.prisma);
      const ben = await createUser(app.prisma);
      await followAt(ben, 1);

      const page = notificationPage.parse((await list(await loginAs(app, ana))).json());

      expect(page).toEqual({ items: [], nextCursor: null });
    });

    it('pages without gaps or duplicates, breaking timestamp ties by id', async () => {
      const ben = await createUser(app.prisma);
      const created = [];
      for (let i = 0; i < 5; i += 1) created.push(await followAt(ben, i < 3 ? 0 : i));
      const cookie = await loginAs(app, ben);

      const seen: string[] = [];
      let cursor: string | undefined;
      let pages = 0;
      do {
        const query: Record<string, string> = cursor ? { limit: '2', cursor } : { limit: '2' };
        const page = notificationPage.parse((await list(cookie, query)).json());
        seen.push(...page.items.map((item) => item.id));
        cursor = page.nextCursor ?? undefined;
        pages += 1;
      } while (cursor);

      const expected = [...created]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))
        .map((row) => row.id);
      expect(seen).toEqual(expected);
      expect(pages).toBe(3);
    });

    it('rejects a malformed cursor with 400', async () => {
      const response = await list(await loginAs(app, await createUser(app.prisma)), {
        cursor: 'garbage',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          details: { fieldErrors: { cursor: ['Invalid cursor'] } },
        },
      });
    });

    it.each(['0', '51', 'abc'])('rejects limit=%s with 400', async (limit) => {
      const response = await list(await loginAs(app, await createUser(app.prisma)), { limit });

      expect(response.statusCode).toBe(400);
    });

    it('returns 401 without a session', async () => {
      expect((await list()).statusCode).toBe(401);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('counts only the signed-in user’s unread notifications', async () => {
      const ana = await createUser(app.prisma);
      const ben = await createUser(app.prisma);
      await followAt(ben, 1);
      await followAt(ben, 2);
      await createNotification(app.prisma, ben, await createUser(app.prisma), {
        readAt: new Date(),
      });
      await followAt(ana, 1);

      const response = await unreadCount(await loginAs(app, ben));

      expect(response.statusCode).toBe(200);
      expect(unreadCountSchema.parse(response.json())).toEqual({ count: 2 });
    });

    it('is zero without notifications', async () => {
      const response = await unreadCount(await loginAs(app, await createUser(app.prisma)));

      expect(response.json()).toEqual({ count: 0 });
    });

    it('returns 401 without a session', async () => {
      expect((await unreadCount()).statusCode).toBe(401);
    });
  });

  describe('POST /api/notifications/read', () => {
    it('marks as read everything up to `until`, leaving newer ones unread', async () => {
      const ben = await createUser(app.prisma);
      const older = await followAt(ben, 1);
      const seenNewest = await followAt(ben, 2);
      const arrivedLater = await followAt(ben, 3);
      const cookie = await loginAs(app, ben);

      const response = await markRead(cookie, { until: seenNewest.createdAt.toISOString() });

      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');
      const rows = await app.prisma.notification.findMany({ select: { id: true, readAt: true } });
      const readIds = rows.filter((row) => row.readAt !== null).map((row) => row.id);
      expect(readIds.sort()).toEqual([older.id, seenNewest.id].sort());
      expect(rows.find((row) => row.id === arrivedLater.id)?.readAt).toBeNull();
      expect((await unreadCount(cookie)).json()).toEqual({ count: 1 });
    });

    it('keeps the first read time when repeated', async () => {
      const ben = await createUser(app.prisma);
      const firstRead = new Date('2026-11-20T13:00:00.000Z');
      const row = await createNotification(app.prisma, ben, await createUser(app.prisma), {
        createdAt: minutesAfterBase(1),
        readAt: firstRead,
      });

      const response = await markRead(await loginAs(app, ben), {
        until: minutesAfterBase(10).toISOString(),
      });

      expect(response.statusCode).toBe(204);
      const after = await app.prisma.notification.findUniqueOrThrow({ where: { id: row.id } });
      expect(after.readAt).toEqual(firstRead);
    });

    it('never touches other users’ notifications', async () => {
      const ana = await createUser(app.prisma);
      const ben = await createUser(app.prisma);
      await followAt(ben, 1);

      await markRead(await loginAs(app, ana), { until: minutesAfterBase(10).toISOString() });

      expect(await app.prisma.notification.count({ where: { readAt: null } })).toBe(1);
    });

    it.each([undefined, {}, { until: 'yesterday' }])('rejects body %j with 400', async (body) => {
      const response = await markRead(await loginAs(app, await createUser(app.prisma)), body);

      expect(response.statusCode).toBe(400);
    });

    it('returns 401 without a session', async () => {
      const response = await markRead(undefined, { until: minutesAfterBase(0).toISOString() });

      expect(response.statusCode).toBe(401);
    });
  });
});
