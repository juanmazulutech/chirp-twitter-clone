import type { Prisma, PrismaClient, User } from '../../src/generated/prisma/client';

let sequence = 0;

/** Creates a user with unique credentials; any field can be overridden. */
export async function createUser(
  prisma: PrismaClient,
  overrides: Partial<Prisma.UserCreateInput> = {},
): Promise<User> {
  sequence += 1;
  return prisma.user.create({
    data: {
      email: `user${sequence}@chirp.test`,
      username: `user${sequence}`,
      displayName: `Test User ${sequence}`,
      // Replaced by a real argon2 hash once password hashing exists (C10).
      passwordHash: 'not-a-real-hash',
      ...overrides,
    },
  });
}
