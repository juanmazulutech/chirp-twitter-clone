import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildTestApp } from '../../test/app';
import { testDatabaseUrl } from '../../test/env';
import { type App, buildApp } from '../app';
import { loadEnv } from '../config/env';
import { MemoryStorage } from '../lib/memory-storage';
import { S3Storage } from '../lib/s3-storage';
import storagePlugin from './storage';

describe('storage plugin', () => {
  it('exposes the driver on the app and closes it with the app', async () => {
    const storage = new MemoryStorage();
    const close = vi.spyOn(storage, 'close');
    const app = Fastify({ logger: false });
    await app.register(storagePlugin, { storage });
    await app.ready();

    expect(app.storage).toBe(storage);

    await app.close();
    expect(close).toHaveBeenCalledOnce();
  });
});

describe('buildApp storage', () => {
  let app: App | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('uses the injected driver', async () => {
    const storage = new MemoryStorage();
    app = await buildTestApp({}, { storage });

    expect(app.storage).toBe(storage);
  });

  it('builds the S3 driver from the configuration by default', async () => {
    const config = loadEnv({
      LOG_LEVEL: 'silent',
      DATABASE_URL: testDatabaseUrl(),
      S3_PUBLIC_ENDPOINT: 'http://media.chirp.test',
    });

    app = await buildApp(config);
    await app.ready();

    expect(app.storage).toBeInstanceOf(S3Storage);
    expect(app.storage.publicUrl('a.png')).toBe('http://media.chirp.test/chirp-media/a.png');
  });
});
