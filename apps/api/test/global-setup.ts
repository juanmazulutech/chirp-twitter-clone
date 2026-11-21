import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { testDatabaseUrl } from './env';

const apiRoot = fileURLToPath(new URL('..', import.meta.url));
const prismaBin = fileURLToPath(new URL('../../../node_modules/.bin/prisma', import.meta.url));

/** Applies every committed migration to the test database once per test run. */
export default function setup(): void {
  const url = testDatabaseUrl();

  try {
    execFileSync(prismaBin, ['migrate', 'deploy'], {
      cwd: apiRoot,
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'pipe',
    });
  } catch (error) {
    const output = error instanceof Error && 'stderr' in error ? String(error.stderr) : '';
    throw new Error(
      `Could not migrate the test database (${new URL(url).host}). Is it running? Try \`npm run services:up\`.\n${output}`,
      { cause: error },
    );
  }
}
