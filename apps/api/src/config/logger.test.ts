import { describe, expect, it } from 'vitest';

import { buildLoggerOptions, REDACTED_LOG_PATHS } from './logger';

describe('buildLoggerOptions', () => {
  it('emits structured JSON by default', () => {
    const options = buildLoggerOptions({ LOG_LEVEL: 'info', LOG_PRETTY: false });

    expect(options).toMatchObject({ level: 'info' });
    expect(options).not.toHaveProperty('transport');
  });

  it('uses pino-pretty when pretty logs are enabled', () => {
    const options = buildLoggerOptions({ LOG_LEVEL: 'debug', LOG_PRETTY: true });

    expect(options).toMatchObject({ level: 'debug', transport: { target: 'pino-pretty' } });
  });

  it('redacts credentials and session cookies', () => {
    expect(REDACTED_LOG_PATHS).toEqual(
      expect.arrayContaining(['req.headers.cookie', 'req.headers.authorization', '*.password']),
    );
    expect(buildLoggerOptions({ LOG_LEVEL: 'info', LOG_PRETTY: false })).toMatchObject({
      redact: { paths: REDACTED_LOG_PATHS, censor: '[REDACTED]' },
    });
  });
});
