import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import type { App } from '../../app';

describe('health routes', () => {
  let app: App;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/health (liveness)', () => {
    it('reports the process as alive', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/health' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    });

    it('is only served under the /api prefix', async () => {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(404);
    });

    it('returns a generated request id', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/health' });

      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('propagates a well-formed incoming request id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
        headers: { 'x-request-id': 'trace-abc_123' },
      });

      expect(response.headers['x-request-id']).toBe('trace-abc_123');
    });

    it('replaces a malformed incoming request id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
        headers: { 'x-request-id': 'bad id\nwith newline' },
      });

      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('GET /api/health/ready (readiness)', () => {
    it('is ready when the database responds', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/health/ready' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok', checks: { database: 'up' } });
    });

    it('is unavailable when the database is unreachable', async () => {
      // Port 1 refuses connections immediately.
      const offline = await buildTestApp({
        DATABASE_URL: 'postgresql://chirp:chirp@127.0.0.1:1/chirp_test',
      });

      try {
        const response = await offline.inject({ method: 'GET', url: '/api/health/ready' });

        expect(response.statusCode).toBe(503);
        expect(response.json()).toEqual({ status: 'unavailable', checks: { database: 'down' } });
      } finally {
        await offline.close();
      }
    });
  });
});
