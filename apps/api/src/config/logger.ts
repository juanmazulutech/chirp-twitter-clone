import type { FastifyServerOptions } from 'fastify';

import type { Env } from './env';

/** Paths never written to logs: credentials, session cookies and tokens. */
export const REDACTED_LOG_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
];

export function buildLoggerOptions(
  env: Pick<Env, 'LOG_LEVEL' | 'LOG_PRETTY'>,
): NonNullable<FastifyServerOptions['logger']> {
  return {
    level: env.LOG_LEVEL,
    redact: { paths: REDACTED_LOG_PATHS, censor: '[REDACTED]' },
    ...(env.LOG_PRETTY && {
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
    }),
  };
}
