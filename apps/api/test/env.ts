// Test-only configuration. The test suite truncates tables, so it must never
// run against a database that is not explicitly a test database.

const LOCAL_TEST_DATABASE_URL = 'postgresql://chirp:chirp@localhost:5433/chirp_test';

export class UnsafeTestDatabaseError extends Error {
  override readonly name = 'UnsafeTestDatabaseError';
}

/** Returns the test database URL, refusing any database whose name does not end in `_test`. */
export function testDatabaseUrl(value: string | undefined = process.env.TEST_DATABASE_URL): string {
  const url = value ?? LOCAL_TEST_DATABASE_URL;
  const databaseName = new URL(url).pathname.replace(/^\//, '');

  if (!databaseName.endsWith('_test')) {
    throw new UnsafeTestDatabaseError(
      `Refusing to run tests against "${databaseName}": TEST_DATABASE_URL must point to a database whose name ends in "_test".`,
    );
  }

  return url;
}
