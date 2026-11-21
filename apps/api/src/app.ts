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

export type AppConfig = Env;

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
  }
}

const REQUEST_ID_HEADER = 'x-request-id';
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
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate('config', config);

  app.addHook('onRequest', (request, reply, done) => {
    void reply.header(REQUEST_ID_HEADER, request.id);
    done();
  });

  await app.register(errorsPlugin);
  await app.register(prismaPlugin, { databaseUrl: config.DATABASE_URL });
  await app.register(modules, { prefix: '/api' });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
