import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import type { Env } from './config/env';
import { buildLoggerOptions } from './config/logger';
import modules from './modules';
import errorsPlugin from './plugins/errors';
import prismaPlugin from './plugins/prisma';
import securityPlugin from './plugins/security';
import sessionPlugin from './plugins/session';

export type AppConfig = Env;

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
  }
}

const REQUEST_ID_HEADER = 'x-request-id';
// Bodies are small JSON documents; images go straight to object storage (ADR-14).
const BODY_LIMIT_BYTES = 100 * 1024;
const VALID_REQUEST_ID = /^[\w-]{1,64}$/;

/** Reuses a well-formed incoming request id (for tracing) and generates one otherwise. */
function requestId(request: IncomingMessage): string {
  const incoming = request.headers[REQUEST_ID_HEADER];
  return typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
}

/**
 * Builds a fully configured app without listening on a port, so tests can
 * exercise it through `app.inject()`.
 */
export async function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: buildLoggerOptions(config),
    requestIdHeader: false,
    genReqId: requestId,
    bodyLimit: BODY_LIMIT_BYTES,
    // Behind a reverse proxy, the client IP (used for rate limiting) is in X-Forwarded-For.
    trustProxy: config.TRUST_PROXY,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate('config', config);

  app.addHook('onRequest', (request, reply, done) => {
    void reply.header(REQUEST_ID_HEADER, request.id);
    done();
  });

  await app.register(errorsPlugin);
  // Before the session lookup, so blocked requests never reach the database.
  await app.register(securityPlugin, {
    allowedOrigins: config.WEB_ORIGINS,
    globalRateLimit: config.RATE_LIMIT_GLOBAL_MAX,
    strictTransportSecurity: config.COOKIE_SECURE,
  });
  await app.register(prismaPlugin, { databaseUrl: config.DATABASE_URL });
  await app.register(sessionPlugin, {
    sessionTtlDays: config.SESSION_TTL_DAYS,
    cookieSecure: config.COOKIE_SECURE,
  });
  await app.register(modules, { prefix: '/api' });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
