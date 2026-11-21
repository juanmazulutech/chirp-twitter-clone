import { afterEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../test/app';
import type { App, AppConfig } from '../app';

describe('security plugin', () => {
  const apps: App[] = [];

  async function appWith(overrides: Partial<AppConfig> = {}): Promise<App> {
    const app = await buildTestApp(overrides);
    apps.push(app);
    return app;
  }

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  describe('origin check (CSRF)', () => {
    const logout = (app: App, headers: Record<string, string>) =>
      app.inject({ method: 'POST', url: '/api/auth/logout', headers });

    it('blocks a state-changing request from a foreign origin', async () => {
      const app = await appWith();

      const response = await logout(app, { origin: 'https://evil.example' });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: { code: 'FORBIDDEN', message: 'Cross-origin request blocked' },
      });
    });

    it('allows a configured web origin', async () => {
      const app = await appWith({
        WEB_ORIGINS: ['http://localhost:5173', 'http://localhost:8080'],
      });

      expect((await logout(app, { origin: 'http://localhost:5173' })).statusCode).toBe(204);
      expect((await logout(app, { origin: 'http://localhost:8080' })).statusCode).toBe(204);
    });

    it('allows requests without an Origin header (non-browser clients)', async () => {
      const app = await appWith();

      expect((await logout(app, {})).statusCode).toBe(204);
    });

    it('does not check safe methods', async () => {
      const app = await appWith();

      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
        headers: { origin: 'https://evil.example' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('request bodies', () => {
    it('rejects text/plain bodies, which cross-site forms can send without a preflight', async () => {
      const app = await appWith();

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: { 'content-type': 'text/plain' },
        payload: '{"email":"ana@chirp.dev","password":"x"}',
      });

      expect(response.statusCode).toBe(415);
      expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    });

    it('rejects bodies larger than 100 KB', async () => {
      const app = await appWith();

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'ana@chirp.dev', password: 'x'.repeat(101 * 1024) },
      });

      expect(response.statusCode).toBe(413);
    });
  });

  describe('security headers', () => {
    it('sends strict headers for a JSON API', async () => {
      const app = await appWith();

      const { headers } = await app.inject({ method: 'GET', url: '/api/health' });

      expect(headers['content-security-policy']).toBe("default-src 'none';frame-ancestors 'none'");
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['referrer-policy']).toBe('no-referrer');
      expect(headers['cross-origin-resource-policy']).toBe('same-origin');
    });

    it('only sends HSTS when served over HTTPS', async () => {
      const plain = await appWith({ COOKIE_SECURE: false });
      const secure = await appWith({ COOKIE_SECURE: true });

      const plainResponse = await plain.inject({ method: 'GET', url: '/api/health' });
      const secureResponse = await secure.inject({ method: 'GET', url: '/api/health' });

      expect(plainResponse.headers['strict-transport-security']).toBeUndefined();
      expect(secureResponse.headers['strict-transport-security']).toContain('max-age=');
    });
  });

  describe('rate limiting', () => {
    it('limits every route per client IP', async () => {
      const app = await appWith({ RATE_LIMIT_GLOBAL_MAX: 3 });
      const health = () => app.inject({ method: 'GET', url: '/api/health' });

      for (let i = 0; i < 3; i++) expect((await health()).statusCode).toBe(200);
      const limited = await health();

      expect(limited.statusCode).toBe(429);
      expect(limited.json()).toEqual({
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
      });
      expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('identifies clients by X-Forwarded-For only when behind a trusted proxy', async () => {
      const fromIp = (app: App, ip: string) =>
        app.inject({ method: 'GET', url: '/api/health', headers: { 'x-forwarded-for': ip } });

      const proxied = await appWith({ RATE_LIMIT_GLOBAL_MAX: 1, TRUST_PROXY: true });
      expect((await fromIp(proxied, '203.0.113.1')).statusCode).toBe(200);
      expect((await fromIp(proxied, '203.0.113.2')).statusCode).toBe(200);

      // Without a trusted proxy the header is ignored, so it cannot be used to dodge limits.
      const direct = await appWith({ RATE_LIMIT_GLOBAL_MAX: 1, TRUST_PROXY: false });
      expect((await fromIp(direct, '203.0.113.1')).statusCode).toBe(200);
      expect((await fromIp(direct, '203.0.113.2')).statusCode).toBe(429);
    });

    it('limits sign-in attempts per account and IP', async () => {
      const app = await appWith({ RATE_LIMIT_AUTH_MAX: 2 });
      const login = (email: string) =>
        app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { email, password: 'WrongPass123!' },
        });

      expect((await login('ana@chirp.dev')).statusCode).toBe(401);
      // Emails are normalized before keying, so case variations share the same budget.
      expect((await login('ANA@chirp.dev')).statusCode).toBe(401);
      expect((await login('ana@chirp.dev')).statusCode).toBe(429);
      // Another account from the same IP keeps its own budget.
      expect((await login('ben@chirp.dev')).statusCode).toBe(401);
    });

    it('limits sign-up attempts per IP', async () => {
      const app = await appWith({ RATE_LIMIT_AUTH_MAX: 2 });
      const register = () =>
        app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'invalid' } });

      expect((await register()).statusCode).toBe(400);
      expect((await register()).statusCode).toBe(400);
      expect((await register()).statusCode).toBe(429);
    });
  });
});
