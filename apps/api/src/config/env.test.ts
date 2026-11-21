import { describe, expect, it } from 'vitest';

import { EnvValidationError, loadEnv } from './env';

const DATABASE_URL = 'postgresql://chirp:chirp@localhost:5433/chirp';

describe('loadEnv', () => {
  it('applies defaults to optional variables', () => {
    expect(loadEnv({ DATABASE_URL })).toEqual({
      API_HOST: '0.0.0.0',
      API_PORT: 3000,
      LOG_LEVEL: 'info',
      LOG_PRETTY: false,
      DATABASE_URL,
    });
  });

  it('coerces and parses provided values', () => {
    const env = loadEnv({
      API_HOST: '127.0.0.1',
      API_PORT: '4000',
      LOG_LEVEL: 'debug',
      LOG_PRETTY: 'true',
      DATABASE_URL: 'postgres://user:secret@db:5432/chirp',
    });

    expect(env).toEqual({
      API_HOST: '127.0.0.1',
      API_PORT: 4000,
      LOG_LEVEL: 'debug',
      LOG_PRETTY: true,
      DATABASE_URL: 'postgres://user:secret@db:5432/chirp',
    });
  });

  it('ignores unrelated variables', () => {
    expect(loadEnv({ DATABASE_URL, PATH: '/usr/bin' })).not.toHaveProperty('PATH');
  });

  it('requires a database URL', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a database URL that is not PostgreSQL', () => {
    expect(() => loadEnv({ DATABASE_URL: 'mysql://localhost/chirp' })).toThrow(
      /DATABASE_URL: Must be a postgresql:\/\/ URL/,
    );
  });

  it('reports every invalid variable in a single error', () => {
    const load = () =>
      loadEnv({ DATABASE_URL, API_PORT: 'not-a-port', LOG_LEVEL: 'loud', LOG_PRETTY: 'yes' });

    expect(load).toThrow(EnvValidationError);
    expect(load).toThrow(/API_PORT/);
    expect(load).toThrow(/LOG_LEVEL/);
    expect(load).toThrow(/LOG_PRETTY/);
  });

  it('rejects an out-of-range port', () => {
    expect(() => loadEnv({ DATABASE_URL, API_PORT: '70000' })).toThrow(/API_PORT/);
  });
});
