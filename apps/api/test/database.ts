import type { PrismaClient } from '../src/generated/prisma/client';

/**
 * Empties every application table (keeping migration history) so each test starts
 * from a clean database. Tables are read from the catalog, so new ones are covered
 * automatically.
 */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;

  // Identifiers come from the system catalog, not user input; quoting keeps them literal.
  const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
