import { describe, expect, it } from 'vitest';

import { testDatabaseUrl, UnsafeTestDatabaseError } from './env';

describe('testDatabaseUrl', () => {
  it('accepts a database whose name ends in _test', () => {
    const url = 'postgresql://chirp:chirp@db:5432/chirp_test';
    expect(testDatabaseUrl(url)).toBe(url);
  });

  it('falls back to the local docker-compose test database', () => {
    expect(testDatabaseUrl(undefined)).toBe('postgresql://chirp:chirp@localhost:5433/chirp_test');
  });

  it.each(['chirp', 'chirp_test_backup', 'production'])(
    'refuses the non-test database "%s"',
    (name) => {
      expect(() => testDatabaseUrl(`postgresql://chirp:chirp@localhost:5433/${name}`)).toThrow(
        UnsafeTestDatabaseError,
      );
    },
  );
});
