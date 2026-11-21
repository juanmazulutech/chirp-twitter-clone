import { type App, type AppConfig, buildApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import { testDatabaseUrl } from './env';

/** Builds a ready app against the test database with silent logs; override any config value. */
export async function buildTestApp(overrides: Partial<AppConfig> = {}): Promise<App> {
  const config = loadEnv({ LOG_LEVEL: 'silent', DATABASE_URL: testDatabaseUrl() });
  const app = await buildApp({ ...config, ...overrides });
  await app.ready();
  return app;
}
