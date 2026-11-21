import fastifyCookie from '@fastify/cookie';
import type { FastifyReply, FastifyRequest, onRequestHookHandler } from 'fastify';
import fp from 'fastify-plugin';

import type { User } from '../generated/prisma/client';
import { UnauthenticatedError } from '../lib/errors';
import { type AuthService, createAuthService } from '../modules/auth/service';

export const SESSION_COOKIE = 'chirp_session';

declare module 'fastify' {
  interface FastifyInstance {
    auth: AuthService;
    /** Route-level `onRequest` guard: rejects anonymous requests before the body is parsed. */
    requireAuth: onRequestHookHandler;
    setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): void;
    clearSessionCookie(reply: FastifyReply): void;
  }

  interface FastifyRequest {
    user: User | null;
    sessionToken: string | null;
  }
}

export interface SessionPluginOptions {
  sessionTtlDays: number;
  cookieSecure: boolean;
}

/** The signed-in user of a request that passed `requireAuth`. */
export function currentUser(request: FastifyRequest): User {
  if (!request.user) throw new UnauthenticatedError();
  return request.user;
}

/**
 * Server-side sessions (ADR-09): the cookie holds a random token, the database holds its
 * hash. Every request carrying the cookie is resolved to `request.user`.
 */
export default fp<SessionPluginOptions>(
  async (app, { sessionTtlDays, cookieSecure }) => {
    await app.register(fastifyCookie);

    const auth = createAuthService({ prisma: app.prisma, sessionTtlDays });
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure,
      path: '/',
    } as const;

    app.decorate('auth', auth);
    app.decorate('setSessionCookie', (reply: FastifyReply, token: string, expiresAt: Date) => {
      void reply.setCookie(SESSION_COOKIE, token, { ...cookieOptions, expires: expiresAt });
    });
    app.decorate('clearSessionCookie', (reply: FastifyReply) => {
      void reply.clearCookie(SESSION_COOKIE, cookieOptions);
    });
    app.decorate('requireAuth', async (request: FastifyRequest) => {
      if (!request.user) throw new UnauthenticatedError();
    });

    // Initialized here so every request object has the same shape.
    app.decorateRequest('user', null);
    app.decorateRequest('sessionToken', null);

    app.addHook('onRequest', async (request, reply) => {
      const token = request.cookies[SESSION_COOKIE];
      if (!token) return;

      const session = await auth.authenticate(token);
      if (!session) {
        app.clearSessionCookie(reply);
        return;
      }

      request.user = session.user;
      request.sessionToken = token;
      if (session.renewedExpiresAt) app.setSessionCookie(reply, token, session.renewedExpiresAt);
    });
  },
  { name: 'session', fastify: '5.x', dependencies: ['prisma'] },
);
