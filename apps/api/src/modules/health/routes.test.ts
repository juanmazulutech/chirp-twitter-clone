import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';

describe('GET /api/health', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

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
