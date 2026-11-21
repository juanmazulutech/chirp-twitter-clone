import { type App, type AppConfig, buildApp } from '../src/app';
import { loadEnv } from '../src/config/env';

/** Builds a ready app with silent logs; override any config value per test. */
export async function buildTestApp(overrides: Partial<AppConfig> = {}): Promise<App> {
  const app = await buildApp({ ...loadEnv({ LOG_LEVEL: 'silent' }), ...overrides });
  await app.ready();
  return app;
}
