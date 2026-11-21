import { describe, expect, it } from 'vitest';

import { generateSessionToken, hashSessionToken } from './tokens';

describe('generateSessionToken', () => {
  it('returns 43 URL-safe characters (32 random bytes)', () => {
    const token = generateSessionToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
  });

  it('never repeats', () => {
    const tokens = new Set(Array.from({ length: 1000 }, generateSessionToken));

    expect(tokens.size).toBe(1000);
  });
});

describe('hashSessionToken', () => {
  it('returns a 64-character hex SHA-256 digest', () => {
    expect(hashSessionToken('token')).toBe(
      '3c469e9d6c5875d37a43f353d4f88e61fcf812c66eee3457465a40b0da4153e0',
    );
  });

  it('is deterministic, so sessions can be looked up by hash', () => {
    const token = generateSessionToken();

    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it('never stores the token itself', () => {
    const token = generateSessionToken();

    expect(hashSessionToken(token)).not.toContain(token);
    expect(hashSessionToken(token)).not.toBe(hashSessionToken(generateSessionToken()));
  });
});
