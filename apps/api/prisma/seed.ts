// Demo data (docs/ARCHITECTURE.md §9). Grows with each feature (ADR-21).
//   npm run db:seed                       reset application data and seed it again
//   tsx prisma/seed.ts --if-empty         seed only an empty database (Docker entrypoint)
import { fileURLToPath } from 'node:url';

import { loadEnv } from '../src/config/env';
import type { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/lib/password';
import { createPrismaClient } from '../src/lib/prisma-client';
import { SEED_EMAIL_DOMAIN, SEED_PASSWORD, seedPersonas } from './seed-data/users';

export type SeedMode = 'reset' | 'if-empty';

export interface SeedResult {
  seeded: boolean;
  users: number;
}

export async function seedDatabase(
  prisma: PrismaClient,
  { mode = 'reset' }: { mode?: SeedMode } = {},
): Promise<SeedResult> {
  if (mode === 'if-empty' && (await prisma.user.count()) > 0) {
    return { seeded: false, users: 0 };
  }

  // Each account gets its own salted hash, like a real registration.
  const users = await Promise.all(
    seedPersonas.map(async (persona) => ({
      email: `${persona.username}@${SEED_EMAIL_DOMAIN}`,
      username: persona.username,
      displayName: persona.displayName,
      bio: persona.bio,
      passwordHash: await hashPassword(SEED_PASSWORD),
      createdAt: new Date(persona.joinedAt),
    })),
  );

  await prisma.$transaction(async (tx) => {
    // Every application table cascades from users, so this clears all seeded data.
    await tx.user.deleteMany();
    await tx.user.createMany({ data: users });
  });

  return { seeded: true, users: users.length };
}

/** CLI entry point; arguments, environment and output are injectable for tests. */
export async function runSeedCli(
  argv: string[] = process.argv,
  env: Record<string, string | undefined> = process.env,
  write: (message: string) => void = (message) => process.stdout.write(message),
): Promise<void> {
  const mode: SeedMode = argv.includes('--if-empty') ? 'if-empty' : 'reset';
  const prisma = createPrismaClient(loadEnv(env).DATABASE_URL);

  try {
    const result = await seedDatabase(prisma, { mode });
    write(
      result.seeded
        ? `Seeded ${result.users} users. Sign in as demo@${SEED_EMAIL_DOMAIN} / ${SEED_PASSWORD}\n`
        : 'Database already has data; skipping seed (--if-empty).\n',
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await runSeedCli();
