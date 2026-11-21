import { emailSchema, usernameSchema } from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runSeedCli, seedDatabase } from '../prisma/seed';
import {
  DEMO_USERNAME,
  SEED_EMAIL_DOMAIN,
  SEED_PASSWORD,
  seedPersonas,
} from '../prisma/seed-data/users';
import type { App } from '../src/app';
import { buildTestApp } from './app';
import { resetDatabase } from './database';
import { testDatabaseUrl } from './env';
import { createUser } from './factories/users';

describe('seed', () => {
  let app: App;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app.prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates at least 10 users with valid, normalized identifiers', async () => {
    const result = await seedDatabase(app.prisma);

    expect(result).toEqual({ seeded: true, users: seedPersonas.length });
    const users = await app.prisma.user.findMany();
    expect(users.length).toBeGreaterThanOrEqual(10);
    for (const user of users) {
      expect(emailSchema.parse(user.email)).toBe(user.email);
      expect(usernameSchema.parse(user.username)).toBe(user.username);
      expect(user.bio.length).toBeGreaterThan(0);
    }
  });

  it('gives every account its own password hash', async () => {
    await seedDatabase(app.prisma);

    const hashes = (await app.prisma.user.findMany()).map((user) => user.passwordHash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('lets the documented demo account sign in', async () => {
    await seedDatabase(app.prisma);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: `${DEMO_USERNAME}@${SEED_EMAIL_DOMAIN}`, password: SEED_PASSWORD },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ user: { username: DEMO_USERNAME } });
  });

  it('keeps the personas join dates', async () => {
    await seedDatabase(app.prisma);

    const ana = await app.prisma.user.findUniqueOrThrow({ where: { username: 'ana_codes' } });
    expect(ana.createdAt.toISOString()).toBe('2026-03-12T14:20:00.000Z');
  });

  it('is idempotent in reset mode and replaces existing data', async () => {
    await createUser(app.prisma, { username: 'leftover' });

    await seedDatabase(app.prisma);
    await seedDatabase(app.prisma);

    expect(await app.prisma.user.count()).toBe(seedPersonas.length);
    expect(await app.prisma.user.findUnique({ where: { username: 'leftover' } })).toBeNull();
  });

  it('leaves a database with data untouched in if-empty mode', async () => {
    await createUser(app.prisma, { username: 'existing' });

    const result = await seedDatabase(app.prisma, { mode: 'if-empty' });

    expect(result).toEqual({ seeded: false, users: 0 });
    expect(await app.prisma.user.count()).toBe(1);
  });

  it('seeds an empty database in if-empty mode', async () => {
    const result = await seedDatabase(app.prisma, { mode: 'if-empty' });

    expect(result.seeded).toBe(true);
    expect(await app.prisma.user.count()).toBe(seedPersonas.length);
  });

  describe('command line', () => {
    const run = async (argv: string[]) => {
      const output: string[] = [];
      await runSeedCli(argv, { DATABASE_URL: testDatabaseUrl() }, (line) => output.push(line));
      return output.join('');
    };

    it('resets and seeds by default, printing the demo credentials', async () => {
      await createUser(app.prisma, { username: 'leftover' });

      const output = await run(['node', 'seed.ts']);

      expect(output).toContain(`demo@${SEED_EMAIL_DOMAIN} / ${SEED_PASSWORD}`);
      expect(await app.prisma.user.count()).toBe(seedPersonas.length);
    });

    it('skips a database with data when called with --if-empty', async () => {
      await createUser(app.prisma);

      const output = await run(['node', 'seed.ts', '--if-empty']);

      expect(output).toContain('skipping seed');
      expect(await app.prisma.user.count()).toBe(1);
    });
  });
});
