import { hash, verify } from '@node-rs/argon2';

/**
 * argon2id with OWASP's minimum recommended parameters: 19 MiB memory, 2 iterations,
 * 1 lane. Parameters are encoded in every hash, so they can be raised later without
 * invalidating existing hashes.
 */
const HASH_OPTIONS = {
  // `Algorithm.Argon2id` is a `const enum`, which isolated modules cannot import.
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, HASH_OPTIONS);
}

/** Returns false for a wrong password or a malformed hash; never throws for bad input. */
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Spends the same time as a real verification when the account does not exist, so
 * login response times do not reveal which emails are registered. Always false.
 */
export async function verifyPasswordAgainstNothing(password: string): Promise<false> {
  dummyHash ??= hashPassword('chirp-timing-equalizer');
  await verifyPassword(await dummyHash, password);
  return false;
}
