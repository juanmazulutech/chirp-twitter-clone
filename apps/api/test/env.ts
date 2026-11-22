// Test-only configuration. The test suite truncates tables, so it must never
// run against a database that is not explicitly a test database.

const LOCAL_TEST_DATABASE_URL = 'postgresql://chirp:chirp@localhost:5433/chirp_test';

export class UnsafeTestDatabaseError extends Error {
  override readonly name = 'UnsafeTestDatabaseError';
}

/**
 * Returns the test database URL from `TEST_DATABASE_URL` (or the local docker-compose
 * default), refusing any database whose name does not end in `_test`.
 */
export function testDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  const url = env.TEST_DATABASE_URL ?? LOCAL_TEST_DATABASE_URL;
  const databaseName = new URL(url).pathname.replace(/^\//, '');

  if (!databaseName.endsWith('_test')) {
    throw new UnsafeTestDatabaseError(
      `Refusing to run tests against "${databaseName}": TEST_DATABASE_URL must point to a database whose name ends in "_test".`,
    );
  }

  return url;
}

/**
 * Storage settings for configurations built in tests. They are required in env.ts and the
 * suite injects `MemoryStorage`, so these only need to be valid, never reachable.
 */
export const TEST_STORAGE_ENV = {
  S3_ENDPOINT: 'http://storage.chirp.test',
  S3_PUBLIC_ENDPOINT: 'http://media.chirp.test',
  S3_ACCESS_KEY_ID: 'test-access-key',
  S3_SECRET_ACCESS_KEY: 'test-secret-key',
} as const;
