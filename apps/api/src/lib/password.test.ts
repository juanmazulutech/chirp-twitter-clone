import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword, verifyPasswordAgainstNothing } from './password';

describe('hashPassword', () => {
  it('produces an argon2id hash with the configured parameters', async () => {
    const passwordHash = await hashPassword('Password123!');

    expect(passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(passwordHash).not.toContain('Password123!');
  });

  it('salts every hash, so equal passwords produce different hashes', async () => {
    const [first, second] = await Promise.all([
      hashPassword('Password123!'),
      hashPassword('Password123!'),
    ]);

    expect(first).not.toBe(second);
  });
});

describe('verifyPassword', () => {
  it('accepts the original password', async () => {
    const passwordHash = await hashPassword('Password123!');

    expect(await verifyPassword(passwordHash, 'Password123!')).toBe(true);
  });

  it('rejects a different password', async () => {
    const passwordHash = await hashPassword('Password123!');

    expect(await verifyPassword(passwordHash, 'password123!')).toBe(false);
    expect(await verifyPassword(passwordHash, '')).toBe(false);
  });

  it('handles unicode passwords', async () => {
    const passwordHash = await hashPassword('contraseña-🐦-密码');

    expect(await verifyPassword(passwordHash, 'contraseña-🐦-密码')).toBe(true);
    expect(await verifyPassword(passwordHash, 'contrasena-🐦-密码')).toBe(false);
  });

  it('returns false instead of throwing for a malformed hash', async () => {
    expect(await verifyPassword('not-a-real-hash', 'Password123!')).toBe(false);
    expect(await verifyPassword('', 'Password123!')).toBe(false);
  });
});

describe('verifyPasswordAgainstNothing', () => {
  it('always rejects', async () => {
    expect(await verifyPasswordAgainstNothing('Password123!')).toBe(false);
    expect(await verifyPasswordAgainstNothing('chirp-timing-equalizer')).toBe(false);
  });

  it('takes about as long as a real verification', async () => {
    const passwordHash = await hashPassword('Password123!');
    await verifyPasswordAgainstNothing('warm-up'); // computes the dummy hash once

    const time = async (fn: () => Promise<unknown>) => {
      const start = performance.now();
      await fn();
      return performance.now() - start;
    };
    const real = await time(() => verifyPassword(passwordHash, 'wrong-password'));
    const dummy = await time(() => verifyPasswordAgainstNothing('wrong-password'));

    // Same argon2 work either way; a skipped check would be ~100x faster.
    expect(dummy).toBeGreaterThan(real / 4);
  });
});
