import { describe, expect, it } from 'vitest';

import {
  displayNameSchema,
  emailSchema,
  loginBodySchema,
  newPasswordSchema,
  registerBodySchema,
  usernameSchema,
} from './auth';

describe('emailSchema', () => {
  it('trims and lowercases', () => {
    expect(emailSchema.parse('  Ana@Chirp.DEV ')).toBe('ana@chirp.dev');
  });

  it.each(['', 'ana', 'ana@', '@chirp.dev', 'ana chirp@dev.com'])('rejects "%s"', (value) => {
    expect(emailSchema.safeParse(value).success).toBe(false);
  });

  it('rejects addresses longer than 254 characters', () => {
    expect(emailSchema.safeParse(`${'a'.repeat(64)}@${'b'.repeat(190)}.dev`).success).toBe(false);
  });
});

describe('usernameSchema', () => {
  it('lowercases so usernames are case-insensitive', () => {
    expect(usernameSchema.parse(' Ana_Dev ')).toBe('ana_dev');
  });

  it.each(['abc', 'a'.repeat(15), 'user_1'])('accepts "%s"', (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(true);
  });

  it.each(['ab', 'a'.repeat(16), 'ana.dev', 'ana-dev', 'ana dev', 'añá'])(
    'rejects "%s"',
    (value) => {
      expect(usernameSchema.safeParse(value).success).toBe(false);
    },
  );

  it.each(['home', 'Search', ' API '])('rejects the reserved route name "%s"', (value) => {
    const result = usernameSchema.safeParse(value);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('This username is not available');
  });

  it.each([
    ['', 'Choose a username'],
    ['ab', 'Use at least 3 characters'],
    ['a'.repeat(16), 'Use at most 15 characters'],
    ['ana.dev', 'Use only letters, numbers and underscores'],
  ])('explains what is wrong with "%s" first', (value, message) => {
    expect(usernameSchema.safeParse(value).error?.issues[0]?.message).toBe(message);
  });

  it('accepts names that only contain a reserved word', () => {
    expect(usernameSchema.safeParse('home_cook').success).toBe(true);
  });
});

describe('displayNameSchema', () => {
  it('trims surrounding whitespace', () => {
    expect(displayNameSchema.parse('  Ana García  ')).toBe('Ana García');
  });

  it('counts emoji as single characters', () => {
    expect(displayNameSchema.safeParse('🐦'.repeat(50)).success).toBe(true);
    expect(displayNameSchema.safeParse('🐦'.repeat(51)).success).toBe(false);
  });

  it('rejects an empty or blank name', () => {
    expect(displayNameSchema.safeParse('').success).toBe(false);
    expect(displayNameSchema.safeParse('   ').success).toBe(false);
  });
});

describe('newPasswordSchema', () => {
  it('accepts 8 to 72 characters', () => {
    expect(newPasswordSchema.safeParse('a'.repeat(8)).success).toBe(true);
    expect(newPasswordSchema.safeParse('a'.repeat(72)).success).toBe(true);
  });

  it('rejects fewer than 8 or more than 72 characters', () => {
    expect(newPasswordSchema.safeParse('a'.repeat(7)).success).toBe(false);
    expect(newPasswordSchema.safeParse('a'.repeat(73)).success).toBe(false);
  });

  it.each([
    ['', 'Choose a password'],
    ['short', 'Use at least 8 characters'],
  ])('explains what is wrong with "%s" first', (value, message) => {
    expect(newPasswordSchema.safeParse(value).error?.issues[0]?.message).toBe(message);
  });

  it('keeps spaces, which are part of the password', () => {
    expect(newPasswordSchema.parse('  spaced  ')).toBe('  spaced  ');
  });
});

describe('registerBodySchema', () => {
  it('normalizes a valid registration', () => {
    expect(
      registerBodySchema.parse({
        email: 'Ana@Chirp.dev',
        username: 'Ana',
        displayName: ' Ana ',
        password: 'Password123!',
      }),
    ).toEqual({
      email: 'ana@chirp.dev',
      username: 'ana',
      displayName: 'Ana',
      password: 'Password123!',
    });
  });
});

describe('loginBodySchema', () => {
  it('does not apply password complexity rules when signing in', () => {
    expect(loginBodySchema.safeParse({ email: 'ana@chirp.dev', password: 'short' }).success).toBe(
      true,
    );
  });

  it('requires a password', () => {
    expect(loginBodySchema.safeParse({ email: 'ana@chirp.dev', password: '' }).success).toBe(false);
  });
});
