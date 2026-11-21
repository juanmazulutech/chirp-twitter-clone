import { type App, type AppConfig, buildApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import { testDatabaseUrl } from './env';

/** Builds a ready app against the test database with silent logs; override any config value. */
export async function buildTestApp(overrides: Partial<AppConfig> = {}): Promise<App> {
  const config = loadEnv({
    LOG_LEVEL: 'silent',
    DATABASE_URL: testDatabaseUrl(),
    // High limits so suites can sign in repeatedly; rate limiting has its own tests.
    RATE_LIMIT_GLOBAL_MAX: '10000',
    RATE_LIMIT_AUTH_MAX: '10000',
  });
  const app = await buildApp({ ...config, ...overrides });
  await app.ready();
  return app;
}
