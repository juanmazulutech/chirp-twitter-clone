import { type App, type AppConfig, buildApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import { MemoryStorage } from '../src/lib/memory-storage';
import { TEST_STORAGE_ENV, testDatabaseUrl } from './env';

export interface TestAppOptions {
  /** Pass one to inspect stored objects from the test; a fresh one is used otherwise. */
  storage?: MemoryStorage;
}

/**
 * Builds a ready app against the test database with silent logs and in-memory
 * storage; override any config value.
 */
export async function buildTestApp(
  overrides: Partial<AppConfig> = {},
  { storage = new MemoryStorage() }: TestAppOptions = {},
): Promise<App> {
  const config = loadEnv({
    LOG_LEVEL: 'silent',
    DATABASE_URL: testDatabaseUrl(),
    ...TEST_STORAGE_ENV,
    // High limits so suites can sign in repeatedly; rate limiting has its own tests.
    RATE_LIMIT_GLOBAL_MAX: '10000',
    RATE_LIMIT_AUTH_MAX: '10000',
  });
  const app = await buildApp({ ...config, ...overrides }, { storage });
  await app.ready();
  return app;
}
