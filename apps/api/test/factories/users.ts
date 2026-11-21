import type { Prisma, PrismaClient, User } from '../../src/generated/prisma/client';
import { hashPassword } from '../../src/lib/password';

/** Password of every factory user unless `passwordHash` is overridden. */
export const DEFAULT_PASSWORD = 'Password123!';

// argon2 is deliberately slow; hash the shared password once per test run.
let defaultPasswordHash: Promise<string> | undefined;
let sequence = 0;

/** Creates a user with unique credentials and `DEFAULT_PASSWORD`; any field can be overridden. */
export async function createUser(
  prisma: PrismaClient,
  overrides: Partial<Prisma.UserCreateInput> = {},
): Promise<User> {
  sequence += 1;
  defaultPasswordHash ??= hashPassword(DEFAULT_PASSWORD);

  return prisma.user.create({
    data: {
      email: `user${sequence}@chirp.test`,
      username: `user${sequence}`,
      displayName: `Test User ${sequence}`,
      passwordHash: await defaultPasswordHash,
      ...overrides,
    },
  });
}
