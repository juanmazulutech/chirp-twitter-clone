import closeWithGrace from 'close-with-grace';

import { buildApp } from './app';
import { type Env, EnvValidationError, loadEnv } from './config/env';

function loadConfigOrExit(): Env {
  try {
    return loadEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

const config = loadConfigOrExit();
const app = await buildApp(config);

closeWithGrace({ delay: 10_000 }, async ({ signal, err }) => {
  if (err) app.log.error({ err }, 'Shutting down after an unexpected error');
  else app.log.info({ signal }, 'Shutting down');
  await app.close();
});

await app.listen({ host: config.API_HOST, port: config.API_PORT });
