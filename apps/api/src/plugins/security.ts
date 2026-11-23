import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';

import { ForbiddenError } from '../lib/errors';

export interface SecurityPluginOptions {
  /** Browser origins allowed to make state-changing requests. */
  allowedOrigins: string[];
  /** Requests per minute per client IP, across every route. */
  globalRateLimit: number;
  /** Sends HSTS; enable only when the API is served over HTTPS. */
  strictTransportSecurity: boolean;
}

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Errors thrown by the rate limiter reach the errors plugin as a 429 (RATE_LIMITED). */
function rateLimitExceeded(_request: unknown, context: { statusCode: number }) {
  return Object.assign(new Error('Rate limit exceeded'), { statusCode: context.statusCode });
}

/**
 * Request hardening (ADR-09):
 * - CSRF: state-changing requests from a browser must come from an allowed origin;
 *   requests without `Origin` come from non-browser clients, which CSRF cannot target.
 * - JSON-only bodies: no `text/plain`, so cross-site forms cannot post without a preflight.
 * - Strict headers for a JSON API, and a per-IP rate limit on every route.
 */
export default fp<SecurityPluginOptions>(
  async (app, { allowedOrigins, globalRateLimit, strictTransportSecurity }) => {
    const allowed = new Set(allowedOrigins);

    app.addHook('onRequest', async (request) => {
      const origin = request.headers.origin;
      if (STATE_CHANGING_METHODS.has(request.method) && origin && !allowed.has(origin)) {
        throw new ForbiddenError('Cross-origin request blocked');
      }
    });

    app.removeContentTypeParser('text/plain');

    await app.register(helmet, {
      // The API only returns JSON: nothing may execute, load or frame it.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: strictTransportSecurity,
    });

    await app.register(rateLimit, {
      global: true,
      max: globalRateLimit,
      timeWindow: '1 minute',
      // In-memory store: correct for a single instance; use Redis when scaling out (ADR-09).
      errorResponseBuilder: rateLimitExceeded,
    });
  },
  { name: 'security', fastify: '5.x' },
);
