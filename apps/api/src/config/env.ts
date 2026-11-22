import { IMAGE_MAX_BYTES } from '@chirp/shared';
import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

/** "http://a:5173, http://b:8080" -> ['http://a:5173', 'http://b:8080'] (normalized origins). */
const originList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.url({ protocol: /^https?$/ }).transform((url) => new URL(url).origin)).min(1));

/** An http(s) endpoint without a trailing slash, so URLs can be joined with "/". */
const httpUrl = z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, ''));

/**
 * The only place that reads environment variables. Every variable is validated
 * at startup so a misconfigured process fails immediately with a clear message.
 */
export const envSchema = z.object({
  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  LOG_PRETTY: booleanString.default(false),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: (issue) => (issue.input === undefined ? 'Required' : 'Must be a postgresql:// URL'),
  }),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  // Set to true behind HTTPS so the session cookie is never sent over plain HTTP.
  COOKIE_SECURE: booleanString.default(false),
  // Browser origins allowed to make state-changing requests (CSRF defense, ADR-09).
  WEB_ORIGINS: originList.default(['http://localhost:5173']),
  // Only behind a reverse proxy: trusts X-Forwarded-For to identify the client IP.
  TRUST_PROXY: booleanString.default(false),
  // Requests per minute: per IP on every route, and on sign-in/sign-up endpoints.
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().min(1).default(300),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(10),
  // S3-compatible object storage (ADR-14). Defaults match the docker-compose `storage` service.
  // The API talks to S3_ENDPOINT; URLs handed to the browser use S3_PUBLIC_ENDPOINT.
  S3_ENDPOINT: httpUrl.default('http://localhost:9000'),
  S3_PUBLIC_ENDPOINT: httpUrl.default('http://localhost:9000'),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(3).max(63).default('chirp-media'),
  S3_ACCESS_KEY_ID: z.string().min(1).default('chirp'),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default('chirpsecret'),
  // Local S3-compatible servers need path-style URLs (http://host/bucket/key).
  S3_FORCE_PATH_STYLE: booleanString.default(true),
  // Largest image a presigned upload accepts; can only lower the shared 5 MB limit.
  UPLOAD_MAX_BYTES: z.coerce.number().int().min(1).max(IMAGE_MAX_BYTES).default(IMAGE_MAX_BYTES),
});

export type Env = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  override readonly name = 'EnvValidationError';
}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const problems = result.error.issues.map(
    (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
  );
  throw new EnvValidationError(`Invalid environment configuration:\n${problems.join('\n')}`);
}
