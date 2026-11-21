import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from '../lib/errors';
import errorsPlugin from './errors';

const signupSchema = z
  .object({
    email: z.email(),
    profile: z.object({ name: z.string().min(1) }),
    password: z.string(),
    confirmation: z.string(),
  })
  .refine((body) => body.password === body.confirmation, { message: 'Passwords do not match' });

async function buildErrorTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(errorsPlugin);

  app.get('/validation', () => {
    throw new ValidationError('Cannot follow yourself');
  });
  app.get('/unauthenticated', () => {
    throw new UnauthenticatedError();
  });
  app.get('/forbidden', () => {
    throw new ForbiddenError();
  });
  app.get('/not-found', () => {
    throw new NotFoundError('Tweet');
  });
  app.get('/conflict', () => {
    throw new ConflictError('Email is already registered', {
      fieldErrors: { email: ['Email is already registered'] },
    });
  });
  app.get('/rate-limited', () => {
    throw Object.assign(new Error('Rate limit exceeded'), { statusCode: 429 });
  });
  app.get('/crash', () => {
    throw new Error('connection to db-internal:5432 refused');
  });
  app.post('/signup', { schema: { body: signupSchema } }, () => ({ ok: true }));

  await app.ready();
  return app;
}

describe('errors plugin', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildErrorTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['/validation', 400, 'VALIDATION_ERROR', 'Cannot follow yourself'],
    ['/unauthenticated', 401, 'UNAUTHENTICATED', 'Authentication required'],
    ['/forbidden', 403, 'FORBIDDEN', 'You are not allowed to perform this action'],
    ['/not-found', 404, 'NOT_FOUND', 'Tweet not found'],
  ])('maps the domain error thrown by %s to %i %s', async (url, status, code, message) => {
    const response = await app.inject({ method: 'GET', url });

    expect(response.statusCode).toBe(status);
    expect(response.json()).toEqual({ error: { code, message } });
  });

  it('includes field errors carried by a domain error', async () => {
    const response = await app.inject({ method: 'GET', url: '/conflict' });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: {
        code: 'CONFLICT',
        message: 'Email is already registered',
        details: { fieldErrors: { email: ['Email is already registered'] }, formErrors: [] },
      },
    });
  });

  it('groups schema validation issues by field path', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/signup',
      payload: { email: 'not-an-email', profile: { name: '' }, password: 'a', confirmation: 'a' },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json<{ error: { code: string; details: Record<string, unknown> } }>();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual({
      fieldErrors: {
        email: [expect.any(String)],
        'profile.name': [expect.any(String)],
      },
      formErrors: [],
    });
  });

  it('reports payload-level issues as form errors', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/signup',
      payload: {
        email: 'ana@chirp.dev',
        profile: { name: 'Ana' },
        password: 'a',
        confirmation: 'b',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { details: { fieldErrors: {}, formErrors: ['Passwords do not match'] } },
    });
  });

  it('maps malformed JSON to a validation error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/signup',
      headers: { 'content-type': 'application/json' },
      payload: '{"email":',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('maps rate limiting to 429', async () => {
    const response = await app.inject({ method: 'GET', url: '/rate-limited' });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toEqual({
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
    });
  });

  it('hides the details of unexpected errors', async () => {
    const response = await app.inject({ method: 'GET', url: '/crash' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(response.body).not.toContain('db-internal');
  });

  it('answers unknown routes with the error format', async () => {
    const response = await app.inject({ method: 'GET', url: '/nope' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route GET /nope not found' },
    });
  });
});
