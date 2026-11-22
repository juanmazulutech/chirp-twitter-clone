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
      SESSION_TTL_DAYS: 30,
      COOKIE_SECURE: false,
      WEB_ORIGINS: ['http://localhost:5173'],
      TRUST_PROXY: false,
      RATE_LIMIT_GLOBAL_MAX: 300,
      RATE_LIMIT_AUTH_MAX: 10,
      S3_ENDPOINT: 'http://localhost:9000',
      S3_PUBLIC_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'chirp-media',
      S3_ACCESS_KEY_ID: 'chirp',
      S3_SECRET_ACCESS_KEY: 'chirpsecret',
      S3_FORCE_PATH_STYLE: true,
      UPLOAD_MAX_BYTES: 5_242_880,
    });
  });

  it('coerces and parses provided values', () => {
    const env = loadEnv({
      API_HOST: '127.0.0.1',
      API_PORT: '4000',
      LOG_LEVEL: 'debug',
      LOG_PRETTY: 'true',
      DATABASE_URL: 'postgres://user:secret@db:5432/chirp',
      SESSION_TTL_DAYS: '7',
      COOKIE_SECURE: 'true',
      WEB_ORIGINS: 'https://chirp.example, https://www.chirp.example/',
      TRUST_PROXY: 'true',
      RATE_LIMIT_GLOBAL_MAX: '600',
      RATE_LIMIT_AUTH_MAX: '5',
      S3_ENDPOINT: 'http://storage:9000/',
      S3_PUBLIC_ENDPOINT: 'https://media.chirp.example',
      S3_REGION: 'eu-west-1',
      S3_BUCKET: 'chirp-prod-media',
      S3_ACCESS_KEY_ID: 'AKIAEXAMPLE',
      S3_SECRET_ACCESS_KEY: 'example-secret',
      S3_FORCE_PATH_STYLE: 'false',
      UPLOAD_MAX_BYTES: '1048576',
    });

    expect(env).toEqual({
      API_HOST: '127.0.0.1',
      API_PORT: 4000,
      LOG_LEVEL: 'debug',
      LOG_PRETTY: true,
      DATABASE_URL: 'postgres://user:secret@db:5432/chirp',
      SESSION_TTL_DAYS: 7,
      COOKIE_SECURE: true,
      WEB_ORIGINS: ['https://chirp.example', 'https://www.chirp.example'],
      TRUST_PROXY: true,
      RATE_LIMIT_GLOBAL_MAX: 600,
      RATE_LIMIT_AUTH_MAX: 5,
      // Trailing slashes are dropped so object URLs can be joined with "/".
      S3_ENDPOINT: 'http://storage:9000',
      S3_PUBLIC_ENDPOINT: 'https://media.chirp.example',
      S3_REGION: 'eu-west-1',
      S3_BUCKET: 'chirp-prod-media',
      S3_ACCESS_KEY_ID: 'AKIAEXAMPLE',
      S3_SECRET_ACCESS_KEY: 'example-secret',
      S3_FORCE_PATH_STYLE: false,
      UPLOAD_MAX_BYTES: 1_048_576,
    });
  });

  it('ignores unrelated variables', () => {
    expect(loadEnv({ DATABASE_URL, PATH: '/usr/bin' })).not.toHaveProperty('PATH');
  });

  it('requires a database URL', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL: Required/);
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

  it('rejects a session lifetime outside 1–365 days', () => {
    expect(() => loadEnv({ DATABASE_URL, SESSION_TTL_DAYS: '0' })).toThrow(/SESSION_TTL_DAYS/);
    expect(() => loadEnv({ DATABASE_URL, SESSION_TTL_DAYS: '366' })).toThrow(/SESSION_TTL_DAYS/);
  });

  it('rejects web origins that are not http(s) URLs', () => {
    expect(() => loadEnv({ DATABASE_URL, WEB_ORIGINS: 'localhost:5173' })).toThrow(/WEB_ORIGINS/);
    expect(() => loadEnv({ DATABASE_URL, WEB_ORIGINS: ' , ' })).toThrow(/WEB_ORIGINS/);
  });

  it('rejects storage endpoints that are not http(s) URLs', () => {
    expect(() => loadEnv({ DATABASE_URL, S3_ENDPOINT: 'storage:9000' })).toThrow(/S3_ENDPOINT/);
    expect(() => loadEnv({ DATABASE_URL, S3_PUBLIC_ENDPOINT: 'ftp://media' })).toThrow(
      /S3_PUBLIC_ENDPOINT/,
    );
  });

  it('rejects empty storage credentials and malformed flags', () => {
    expect(() => loadEnv({ DATABASE_URL, S3_SECRET_ACCESS_KEY: '' })).toThrow(
      /S3_SECRET_ACCESS_KEY/,
    );
    expect(() => loadEnv({ DATABASE_URL, S3_FORCE_PATH_STYLE: 'yes' })).toThrow(
      /S3_FORCE_PATH_STYLE/,
    );
  });

  it('rejects an upload limit above the shared 5 MB maximum', () => {
    expect(() => loadEnv({ DATABASE_URL, UPLOAD_MAX_BYTES: '5242881' })).toThrow(
      /UPLOAD_MAX_BYTES/,
    );
    expect(() => loadEnv({ DATABASE_URL, UPLOAD_MAX_BYTES: '0' })).toThrow(/UPLOAD_MAX_BYTES/);
  });

  it('rejects an out-of-range port', () => {
    expect(() => loadEnv({ DATABASE_URL, API_PORT: '70000' })).toThrow(/API_PORT/);
  });
});
