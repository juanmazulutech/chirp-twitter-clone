import { describe, expect, it } from 'vitest';

import { testDatabaseUrl, UnsafeTestDatabaseError } from './env';

describe('testDatabaseUrl', () => {
  it('uses TEST_DATABASE_URL when it names a _test database', () => {
    const url = 'postgresql://chirp:chirp@db:5432/chirp_test';
    expect(testDatabaseUrl({ TEST_DATABASE_URL: url })).toBe(url);
  });

  it('falls back to the local docker-compose test database when unset', () => {
    expect(testDatabaseUrl({})).toBe('postgresql://chirp:chirp@localhost:5433/chirp_test');
  });

  it.each(['chirp', 'chirp_test_backup', 'production'])(
    'refuses the non-test database "%s"',
    (name) => {
      expect(() =>
        testDatabaseUrl({ TEST_DATABASE_URL: `postgresql://chirp:chirp@localhost:5433/${name}` }),
      ).toThrow(UnsafeTestDatabaseError);
    },
  );
});
