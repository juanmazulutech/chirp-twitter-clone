// The stack the end-to-end suite starts: its own ports, so it can run next to `npm run dev`
// without ever reusing a development server wired to the development database.

export const E2E_API_PORT = 3100;
export const E2E_WEB_PORT = 5174;
export const E2E_WEB_ORIGIN = `http://localhost:${E2E_WEB_PORT}`;

const LOCAL_TEST_DATABASE_URL = 'postgresql://chirp:chirp@localhost:5433/chirp_test';

/** The suite resets and seeds this database, so it refuses anything not named `*_test`. */
export function e2eDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.TEST_DATABASE_URL ?? LOCAL_TEST_DATABASE_URL;
  const databaseName = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Refusing to run end-to-end tests against "${databaseName}": TEST_DATABASE_URL must point to a database whose name ends in "_test".`,
    );
  }
  return url;
}

/**
 * Environment for the API process and the seed. Nothing comes from `.env`: CI has none, and
 * a developer's `.env` points at the development database. Storage defaults to the
 * docker-compose service, because the seed uploads the persona avatars.
 */
export function e2eApiEnv(env: NodeJS.ProcessEnv = process.env) {
  return {
    DATABASE_URL: e2eDatabaseUrl(env),
    API_HOST: '127.0.0.1',
    API_PORT: String(E2E_API_PORT),
    LOG_LEVEL: 'warn',
    LOG_PRETTY: 'false',
    WEB_ORIGINS: E2E_WEB_ORIGIN,
    // Every spec signs up and in through the UI; the production limits would throttle the suite.
    RATE_LIMIT_GLOBAL_MAX: '10000',
    RATE_LIMIT_AUTH_MAX: '1000',
    S3_ENDPOINT: env.S3_ENDPOINT ?? 'http://localhost:9000',
    S3_PUBLIC_ENDPOINT: env.S3_PUBLIC_ENDPOINT ?? 'http://localhost:9000',
    S3_ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID ?? 'chirp',
    S3_SECRET_ACCESS_KEY: env.S3_SECRET_ACCESS_KEY ?? 'chirpsecret',
  } satisfies Record<string, string>;
}
