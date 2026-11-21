import {
  authResponseSchema,
  loginBodySchema,
  registerBodySchema,
  sessionResponseSchema,
} from '@chirp/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { toSessionUser, toUserSummary } from '../../lib/serializers';
import { currentUser } from '../../plugins/session';

const authRoutes: FastifyPluginAsyncZod = async (app) => {
  /** Signing in or up while already signed in replaces the current session. */
  async function endCurrentSession(request: FastifyRequest): Promise<void> {
    if (request.sessionToken) await app.auth.endSession(request.sessionToken);
  }

  app.post(
    '/auth/register',
    { schema: { body: registerBodySchema, response: { 201: authResponseSchema } } },
    async (request, reply) => {
      const { user, token, expiresAt } = await app.auth.register(request.body);
      await endCurrentSession(request);
      app.setSessionCookie(reply, token, expiresAt);
      return reply.code(201).send({ user: toUserSummary(user) });
    },
  );

  app.post(
    '/auth/login',
    { schema: { body: loginBodySchema, response: { 200: authResponseSchema } } },
    async (request, reply) => {
      const { user, token, expiresAt } = await app.auth.login(request.body);
      await endCurrentSession(request);
      app.setSessionCookie(reply, token, expiresAt);
      return { user: toUserSummary(user) };
    },
  );

  /** Idempotent: always succeeds and clears the cookie, even without a valid session. */
  app.post('/auth/logout', async (request, reply) => {
    await endCurrentSession(request);
    app.clearSessionCookie(reply);
    return reply.code(204).send();
  });

  app.get(
    '/auth/me',
    { onRequest: app.requireAuth, schema: { response: { 200: sessionResponseSchema } } },
    async (request) => ({ user: toSessionUser(currentUser(request)) }),
  );
};

export default authRoutes;
