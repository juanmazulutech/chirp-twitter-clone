import { followStateSchema } from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createFollow } from '../../../test/factories/follows';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';

describe('follows routes', () => {
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

  const send = (method: 'POST' | 'DELETE', username: string, cookie?: string) =>
    app.inject({
      method,
      url: `/api/users/${encodeURIComponent(username)}/follow`,
      headers: cookie ? { cookie } : {},
    });
  const follow = (username: string, cookie?: string) => send('POST', username, cookie);
  const unfollow = (username: string, cookie?: string) => send('DELETE', username, cookie);

  const errorCode = (body: unknown) => (body as { error: { code: string } }).error.code;
  const followRows = () =>
    app.prisma.follow.findMany({ select: { followerId: true, followingId: true } });

  describe('POST /api/users/:username/follow', () => {
    it('follows the user and returns the new follow state', async () => {
      const ana = await createUser(app.prisma);
      const bruno = await createUser(app.prisma, { username: 'bruno' });

      const response = await follow('bruno', await loginAs(app, ana));

      expect(response.statusCode).toBe(200);
      expect(followStateSchema.parse(response.json())).toEqual({
        isFollowing: true,
        followersCount: 1,
      });
      expect(await followRows()).toEqual([{ followerId: ana.id, followingId: bruno.id }]);
    });

    it('counts every follower of the user, not only the viewer', async () => {
      const ana = await createUser(app.prisma);
      const bruno = await createUser(app.prisma, { username: 'bruno' });
      await createFollow(app.prisma, await createUser(app.prisma), bruno);

      const response = await follow('bruno', await loginAs(app, ana));

      expect(response.json()).toEqual({ isFollowing: true, followersCount: 2 });
    });

    it('matches the username case-insensitively', async () => {
      const ana = await createUser(app.prisma);
      await createUser(app.prisma, { username: 'bruno' });

      const response = await follow('Bruno', await loginAs(app, ana));

      expect(response.statusCode).toBe(200);
    });

    it('is idempotent: following twice keeps a single follow', async () => {
      const ana = await createUser(app.prisma);
      await createUser(app.prisma, { username: 'bruno' });
      const cookie = await loginAs(app, ana);

      await follow('bruno', cookie);
      const response = await follow('bruno', cookie);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ isFollowing: true, followersCount: 1 });
      expect(await app.prisma.follow.count()).toBe(1);
    });

    it('survives concurrent follows of the same user', async () => {
      const ana = await createUser(app.prisma);
      await createUser(app.prisma, { username: 'bruno' });
      const cookie = await loginAs(app, ana);

      const responses = await Promise.all([follow('bruno', cookie), follow('bruno', cookie)]);

      expect(responses.map((response) => response.statusCode)).toEqual([200, 200]);
      expect(await app.prisma.follow.count()).toBe(1);
    });

    it('rejects following yourself with 400', async () => {
      const ana = await createUser(app.prisma, { username: 'ana' });

      const response = await follow('ana', await loginAs(app, ana));

      expect(response.statusCode).toBe(400);
      expect(errorCode(response.json())).toBe('VALIDATION_ERROR');
      expect(await app.prisma.follow.count()).toBe(0);
    });

    it.each(['ghost', 'home'])('returns 404 for a username nobody has (%s)', async (username) => {
      const ana = await createUser(app.prisma);

      const response = await follow(username, await loginAs(app, ana));

      expect(response.statusCode).toBe(404);
      expect(errorCode(response.json())).toBe('NOT_FOUND');
    });

    it('returns 400 for a username longer than any account can have', async () => {
      const ana = await createUser(app.prisma);

      const response = await follow('a'.repeat(16), await loginAs(app, ana));

      expect(response.statusCode).toBe(400);
    });

    it('returns 401 without a session', async () => {
      await createUser(app.prisma, { username: 'bruno' });

      const response = await follow('bruno');

      expect(response.statusCode).toBe(401);
      expect(await app.prisma.follow.count()).toBe(0);
    });
  });

  describe('DELETE /api/users/:username/follow', () => {
    it('unfollows the user and returns the new follow state', async () => {
      const ana = await createUser(app.prisma);
      const bruno = await createUser(app.prisma, { username: 'bruno' });
      const carla = await createUser(app.prisma);
      await createFollow(app.prisma, ana, bruno);
      await createFollow(app.prisma, carla, bruno);

      const response = await unfollow('bruno', await loginAs(app, ana));

      expect(response.statusCode).toBe(200);
      expect(followStateSchema.parse(response.json())).toEqual({
        isFollowing: false,
        followersCount: 1,
      });
      expect(await followRows()).toEqual([{ followerId: carla.id, followingId: bruno.id }]);
    });

    it('is idempotent: unfollowing someone not followed succeeds', async () => {
      const ana = await createUser(app.prisma);
      await createUser(app.prisma, { username: 'bruno' });

      const response = await unfollow('bruno', await loginAs(app, ana));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ isFollowing: false, followersCount: 0 });
    });

    it('leaves the other direction of a mutual follow alone', async () => {
      const ana = await createUser(app.prisma);
      const bruno = await createUser(app.prisma, { username: 'bruno' });
      await createFollow(app.prisma, ana, bruno);
      await createFollow(app.prisma, bruno, ana);

      await unfollow('bruno', await loginAs(app, ana));

      expect(await followRows()).toEqual([{ followerId: bruno.id, followingId: ana.id }]);
    });

    it('returns 404 for an unknown user', async () => {
      const ana = await createUser(app.prisma);

      const response = await unfollow('ghost', await loginAs(app, ana));

      expect(response.statusCode).toBe(404);
    });

    it('returns 401 without a session', async () => {
      const ana = await createUser(app.prisma);
      const bruno = await createUser(app.prisma, { username: 'bruno' });
      await createFollow(app.prisma, ana, bruno);

      const response = await unfollow('bruno');

      expect(response.statusCode).toBe(401);
      expect(await app.prisma.follow.count()).toBe(1);
    });
  });
});
