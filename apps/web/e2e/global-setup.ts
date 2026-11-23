import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { e2eApiEnv } from './stack';

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url));

function runApiScript(script: string, env: Record<string, string>): void {
  execFileSync('npm', ['run', script, '-w', '@chirp/api'], {
    cwd: repositoryRoot,
    env: { ...process.env, ...env },
    stdio: 'pipe',
  });
}

/**
 * Brings the test database to the committed schema and replaces its data with the demo
 * data set, so every run starts from the same accounts and chirps. The API test suite
 * leaves its own users behind, hence the explicit reset confirmation (ADR-23).
 */
export default function globalSetup(): void {
  const env = e2eApiEnv();
  const databaseName = new URL(env.DATABASE_URL).pathname.replace(/^\//, '');

  try {
    runApiScript('db:deploy', env);
    runApiScript('db:seed', { ...env, SEED_CONFIRM_RESET: databaseName });
  } catch (error) {
    const output = error instanceof Error && 'stderr' in error ? String(error.stderr) : '';
    throw new Error(
      `Could not prepare "${databaseName}" for the end-to-end suite. Are the services running? Try \`npm run services:up\`.\n${output}`,
      { cause: error },
    );
  }
}
