import { describe, expect, it } from 'vitest';

import { BIO_MAX_LENGTH } from '../constants';
import { bioSchema, updateProfileBodySchema, userProfileSchema } from './profiles';

describe('bioSchema', () => {
  it('trims and allows an empty bio', () => {
    expect(bioSchema.parse('  Writes code.  ')).toBe('Writes code.');
    expect(bioSchema.parse('   ')).toBe('');
  });

  it('counts code points, so 160 emoji fit and 161 do not', () => {
    expect(bioSchema.safeParse('🐦'.repeat(BIO_MAX_LENGTH)).success).toBe(true);
    expect(bioSchema.safeParse('🐦'.repeat(BIO_MAX_LENGTH + 1)).success).toBe(false);
  });
});

describe('updateProfileBodySchema', () => {
  it('accepts any subset of the fields, including none', () => {
    expect(updateProfileBodySchema.parse({})).toEqual({});
    expect(updateProfileBodySchema.parse({ bio: ' Hi ' })).toEqual({ bio: 'Hi' });
  });

  it('rejects a blank display name', () => {
    expect(updateProfileBodySchema.safeParse({ displayName: '   ' }).success).toBe(false);
  });
});

describe('userProfileSchema', () => {
  const profile = {
    id: '019a0000-0000-7000-8000-000000000001',
    username: 'ana_codes',
    displayName: 'Ana',
    avatarUrl: null,
    bio: '',
    createdAt: '2026-11-01T09:30:00.000Z',
    followersCount: 2,
    followingCount: 3,
    tweetsCount: 4,
    isFollowing: false,
    isMe: true,
  };

  it('accepts a profile', () => {
    expect(userProfileSchema.parse(profile)).toEqual(profile);
  });

  it('rejects a negative count', () => {
    expect(userProfileSchema.safeParse({ ...profile, tweetsCount: -1 }).success).toBe(false);
  });
});
