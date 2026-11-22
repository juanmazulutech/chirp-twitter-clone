import { sessionResponseSchema } from '@chirp/shared';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { sessionUser } from '@/test/fixtures';
import { server } from '@/test/msw/server';

import { ApiError, apiRequest, isApiError } from './api-client';

/** Resolves with the error a request rejects with, so tests can inspect every field. */
async function failureOf(request: Promise<unknown>): Promise<ApiError> {
  const error = await request.then(
    () => {
      throw new Error('expected the request to fail');
    },
    (reason: unknown) => reason,
  );
  if (!(error instanceof ApiError)) throw error;
  return error;
}

describe('apiRequest', () => {
  it('returns the body parsed by its schema', async () => {
    const result = await apiRequest('/auth/me', { schema: sessionResponseSchema });

    expect(result).toEqual({ user: sessionUser });
  });

  it('sends a JSON body with the method', async () => {
    let received: { method: string; contentType: string | null; body: unknown } | undefined;
    server.use(
      http.post('/api/echo', async ({ request }) => {
        received = {
          method: request.method,
          contentType: request.headers.get('content-type'),
          body: await request.json(),
        };
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(
      apiRequest('/echo', { method: 'POST', body: { content: 'hi' } }),
    ).resolves.toBeUndefined();
    expect(received).toEqual({
      method: 'POST',
      contentType: 'application/json',
      body: { content: 'hi' },
    });
  });

  it('turns an API error into an ApiError with its field errors', async () => {
    server.use(
      http.post('/api/auth/register', () =>
        HttpResponse.json(
          {
            error: {
              code: 'CONFLICT',
              message: 'Already taken',
              details: { fieldErrors: { username: ['This username is taken'] }, formErrors: [] },
            },
          },
          { status: 409 },
        ),
      ),
    );

    const error = await failureOf(apiRequest('/auth/register', { method: 'POST', body: {} }));

    expect(error).toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: 'Already taken',
      fieldErrors: { username: ['This username is taken'] },
      formErrors: [],
    });
  });

  it('defaults to no field errors when the API sends no details', async () => {
    server.use(
      http.get('/api/missing', () =>
        HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 }),
      ),
    );

    const error = await failureOf(apiRequest('/missing'));

    expect(error).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      fieldErrors: {},
      formErrors: [],
    });
  });

  it('reports an error body that is not the API format as an internal error', async () => {
    server.use(http.get('/api/gateway', () => new HttpResponse('Bad Gateway', { status: 502 })));

    const error = await failureOf(apiRequest('/gateway'));

    expect(error).toMatchObject({ status: 502, code: 'INTERNAL_ERROR' });
    expect(error.message).toMatch(/try again/i);
  });

  it('reports a dropped connection as a network error', async () => {
    server.use(http.get('/api/offline', () => HttpResponse.error()));

    const error = await failureOf(apiRequest('/offline'));

    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(error.message).toMatch(/connection/i);
  });

  it('rejects a success body that breaks the shared contract', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ user: { id: 'not-a-uuid' } })));

    const error = await failureOf(apiRequest('/auth/me', { schema: sessionResponseSchema }));

    expect(error).toMatchObject({ status: 200, code: 'INTERNAL_ERROR' });
  });

  it('lets a cancelled request reject as an abort, not as a network error', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      apiRequest('/auth/me', { schema: sessionResponseSchema, signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('isApiError', () => {
  const error = new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'Sign in' });

  it('recognizes API errors, optionally by status', () => {
    expect(isApiError(error)).toBe(true);
    expect(isApiError(error, 401)).toBe(true);
    expect(isApiError(error, 403)).toBe(false);
    expect(isApiError(new Error('boom'))).toBe(false);
  });
});
