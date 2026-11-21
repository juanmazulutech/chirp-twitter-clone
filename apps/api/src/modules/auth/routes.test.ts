import type { LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createUser, DEFAULT_PASSWORD } from '../../../test/factories/users';
import type { App } from '../../app';
import { hashSessionToken } from '../../lib/tokens';
import { SESSION_COOKIE } from '../../plugins/session';

const DAY = 24 * 60 * 60 * 1000;

const registration = {
  email: 'Ana@Chirp.dev',
  username: 'Ana_Dev',
  displayName: 'Ana García',
  password: 'Password123!',
};

function sessionCookie(response: LightMyRequestResponse) {
  return response.cookies.find((cookie) => cookie.name === SESSION_COOKIE);
}

/** The `cookie` request header carrying the session token a response just set. */
function cookieHeader(response: LightMyRequestResponse): string {
  const cookie = sessionCookie(response);
  if (!cookie) throw new Error('response did not set a session cookie');
  return `${SESSION_COOKIE}=${cookie.value}`;
}

describe('auth routes', () => {
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

  const register = (payload: object = registration, headers: Record<string, string> = {}) =>
    app.inject({ method: 'POST', url: '/api/auth/register', payload, headers });
  const login = (payload: object, headers: Record<string, string> = {}) =>
    app.inject({ method: 'POST', url: '/api/auth/login', payload, headers });
  const me = (cookie?: string) =>
    app.inject({ method: 'GET', url: '/api/auth/me', headers: cookie ? { cookie } : {} });
  const logout = (cookie?: string) =>
    app.inject({ method: 'POST', url: '/api/auth/logout', headers: cookie ? { cookie } : {} });

  describe('POST /api/auth/register', () => {
    it('creates the user, signs them in and returns their public summary', async () => {
      const response = await register();

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        user: {
          id: expect.any(String),
          username: 'ana_dev',
          displayName: 'Ana García',
          avatarUrl: null,
        },
      });
      expect(response.body).not.toContain('password');
    });

    it('sets an httpOnly, SameSite=Lax session cookie that expires with the session', async () => {
      const cookie = sessionCookie(await register());

      expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
      expect(cookie?.secure).toBeFalsy();
      expect(cookie?.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const expires = new Date(cookie?.expires ?? 0).getTime();
      expect(expires).toBeGreaterThan(Date.now() + 29 * DAY);
      expect(expires).toBeLessThanOrEqual(Date.now() + 30 * DAY);
    });

    it('stores normalized identifiers, an argon2 hash and only the token hash', async () => {
      const response = await register();
      const token = sessionCookie(response)?.value ?? '';

      const user = await app.prisma.user.findUniqueOrThrow({ where: { username: 'ana_dev' } });
      expect(user.email).toBe('ana@chirp.dev');
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);
      const sessions = await app.prisma.session.findMany();
      expect(sessions).toEqual([expect.objectContaining({ tokenHash: hashSessionToken(token) })]);
    });

    it('rejects a taken email', async () => {
      await createUser(app.prisma, { email: 'ana@chirp.dev' });

      const response = await register();

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({
        error: {
          code: 'CONFLICT',
          details: { fieldErrors: { email: ['This email is already registered'] } },
        },
      });
    });

    it('treats usernames as case-insensitive', async () => {
      await createUser(app.prisma, { username: 'ana_dev' });

      const response = await register({ ...registration, username: 'ANA_DEV' });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({
        error: { details: { fieldErrors: { username: ['This username is taken'] } } },
      });
    });

    it('reports a taken email and username together', async () => {
      await createUser(app.prisma, { email: 'ana@chirp.dev' });
      await createUser(app.prisma, { username: 'ana_dev' });

      const response = await register();

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({
        error: {
          details: {
            fieldErrors: {
              email: ['This email is already registered'],
              username: ['This username is taken'],
            },
          },
        },
      });
    });

    it('maps a concurrent duplicate registration to a conflict', async () => {
      const responses = await Promise.all([register(), register()]);

      expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 409]);
      expect(await app.prisma.user.count()).toBe(1);
    });

    it.each([
      ['email', { email: 'not-an-email' }],
      ['username', { username: 'no spaces' }],
      ['displayName', { displayName: '   ' }],
      ['password', { password: 'short' }],
    ])('rejects an invalid %s', async (field, override) => {
      const response = await register({ ...registration, ...override });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          details: { fieldErrors: { [field]: expect.any(Array) } },
        },
      });
      expect(await app.prisma.user.count()).toBe(0);
    });

    it('rejects a username that collides with a web route', async () => {
      const response = await register({ ...registration, username: 'Home' });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: { details: { fieldErrors: { username: ['This username is not available'] } } },
      });
      expect(await app.prisma.user.count()).toBe(0);
    });

    it('replaces the session it was called with', async () => {
      const existing = await createUser(app.prisma);
      const oldCookie = await loginAs(app, existing);

      const response = await register(registration, { cookie: oldCookie });

      expect(response.statusCode).toBe(201);
      expect((await me(oldCookie)).statusCode).toBe(401);
      expect((await me(cookieHeader(response))).statusCode).toBe(200);
    });
  });

  describe('POST /api/auth/login', () => {
    it('signs in with the right password and sets a session cookie', async () => {
      const user = await createUser(app.prisma, { email: 'ana@chirp.dev' });

      const response = await login({ email: 'ana@chirp.dev', password: DEFAULT_PASSWORD });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: null,
        },
      });
      expect(sessionCookie(response)).toMatchObject({ httpOnly: true, sameSite: 'Lax' });
    });

    it('matches the email case-insensitively', async () => {
      await createUser(app.prisma, { email: 'ana@chirp.dev' });

      const response = await login({ email: ' ANA@chirp.dev ', password: DEFAULT_PASSWORD });

      expect(response.statusCode).toBe(200);
    });

    it('gives the same answer for a wrong password and an unknown email', async () => {
      await createUser(app.prisma, { email: 'ana@chirp.dev' });

      const wrongPassword = await login({ email: 'ana@chirp.dev', password: 'WrongPass123!' });
      const unknownEmail = await login({ email: 'nobody@chirp.dev', password: DEFAULT_PASSWORD });

      for (const response of [wrongPassword, unknownEmail]) {
        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({
          error: { code: 'UNAUTHENTICATED', message: 'Invalid email or password' },
        });
        expect(sessionCookie(response)).toBeUndefined();
      }
      expect(await app.prisma.session.count()).toBe(0);
    });

    it('rejects a missing password', async () => {
      const response = await login({ email: 'ana@chirp.dev', password: '' });

      expect(response.statusCode).toBe(400);
    });

    it('replaces the session it was called with', async () => {
      const user = await createUser(app.prisma, { email: 'ana@chirp.dev' });
      const oldCookie = await loginAs(app, user);

      const response = await login(
        { email: 'ana@chirp.dev', password: DEFAULT_PASSWORD },
        { cookie: oldCookie },
      );

      expect((await me(oldCookie)).statusCode).toBe(401);
      expect((await me(cookieHeader(response))).statusCode).toBe(200);
      expect(await app.prisma.session.count()).toBe(1);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the signed-in user, including private fields', async () => {
      const user = await createUser(app.prisma, { email: 'ana@chirp.dev', bio: 'Hello' });

      const response = await me(await loginAs(app, user));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: null,
          email: 'ana@chirp.dev',
          bio: 'Hello',
          createdAt: user.createdAt.toISOString(),
        },
      });
      expect(response.body).not.toContain('passwordHash');
    });

    it('requires a session', async () => {
      const response = await me();

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
      });
    });

    it('rejects an unknown token and clears the cookie', async () => {
      const response = await me(`${SESSION_COOKIE}=forged-token`);

      expect(response.statusCode).toBe(401);
      expect(sessionCookie(response)).toMatchObject({ value: '' });
    });

    it('rejects an expired session, deletes it and clears the cookie', async () => {
      const user = await createUser(app.prisma);
      const cookie = await loginAs(app, user);
      await app.prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

      const response = await me(cookie);

      expect(response.statusCode).toBe(401);
      expect(sessionCookie(response)).toMatchObject({ value: '' });
      expect(await app.prisma.session.count()).toBe(0);
    });

    it('does not renew a fresh session', async () => {
      const user = await createUser(app.prisma);

      const response = await me(await loginAs(app, user));

      expect(response.statusCode).toBe(200);
      expect(sessionCookie(response)).toBeUndefined();
    });

    it('renews a session that is past half of its lifetime (sliding expiration)', async () => {
      const user = await createUser(app.prisma);
      const cookie = await loginAs(app, user);
      const nearExpiry = new Date(Date.now() + 10 * DAY);
      await app.prisma.session.updateMany({ data: { expiresAt: nearExpiry } });

      const response = await me(cookie);

      expect(response.statusCode).toBe(200);
      const renewed = sessionCookie(response);
      expect(`${SESSION_COOKIE}=${renewed?.value}`).toBe(cookie);
      const session = await app.prisma.session.findFirstOrThrow();
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * DAY);
      // Cookie dates (HTTP-date format) have one-second precision.
      expect(new Date(renewed?.expires ?? 0).getTime()).toBe(
        Math.floor(session.expiresAt.getTime() / 1000) * 1000,
      );
    });
  });

  describe('POST /api/auth/logout', () => {
    it('ends the session and clears the cookie', async () => {
      const user = await createUser(app.prisma);
      const cookie = await loginAs(app, user);

      const response = await logout(cookie);

      expect(response.statusCode).toBe(204);
      expect(sessionCookie(response)).toMatchObject({ value: '' });
      expect(await app.prisma.session.count()).toBe(0);
      expect((await me(cookie)).statusCode).toBe(401);
    });

    it('only ends the session it was called with', async () => {
      const user = await createUser(app.prisma);
      const phone = await loginAs(app, user);
      const laptop = await loginAs(app, user);

      await logout(phone);

      expect((await me(laptop)).statusCode).toBe(200);
    });

    it('succeeds without a session', async () => {
      const response = await logout();

      expect(response.statusCode).toBe(204);
      expect(sessionCookie(response)).toMatchObject({ value: '' });
    });
  });
});
