import { describe, expect, it } from 'vitest';

import { EnvValidationError, loadEnv } from './env';

describe('loadEnv', () => {
  it('applies defaults when variables are absent', () => {
    expect(loadEnv({})).toEqual({
      API_HOST: '0.0.0.0',
      API_PORT: 3000,
      LOG_LEVEL: 'info',
      LOG_PRETTY: false,
    });
  });

  it('coerces and parses provided values', () => {
    const env = loadEnv({
      API_HOST: '127.0.0.1',
      API_PORT: '4000',
      LOG_LEVEL: 'debug',
      LOG_PRETTY: 'true',
    });

    expect(env).toEqual({
      API_HOST: '127.0.0.1',
      API_PORT: 4000,
      LOG_LEVEL: 'debug',
      LOG_PRETTY: true,
    });
  });

  it('ignores unrelated variables', () => {
    expect(loadEnv({ PATH: '/usr/bin', HOME: '/home/chirp' })).not.toHaveProperty('PATH');
  });

  it('reports every invalid variable in a single error', () => {
    const load = () => loadEnv({ API_PORT: 'not-a-port', LOG_LEVEL: 'loud', LOG_PRETTY: 'yes' });

    expect(load).toThrow(EnvValidationError);
    expect(load).toThrow(/API_PORT/);
    expect(load).toThrow(/LOG_LEVEL/);
    expect(load).toThrow(/LOG_PRETTY/);
  });

  it('rejects an out-of-range port', () => {
    expect(() => loadEnv({ API_PORT: '70000' })).toThrow(/API_PORT/);
  });
});
