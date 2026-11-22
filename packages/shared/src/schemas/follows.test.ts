import { describe, expect, it } from 'vitest';

import { followListUserSchema, followStateSchema } from './follows';

describe('followStateSchema', () => {
  it('accepts a follow state', () => {
    expect(followStateSchema.parse({ isFollowing: true, followersCount: 3 })).toEqual({
      isFollowing: true,
      followersCount: 3,
    });
  });

  it.each([-1, 1.5])('rejects a followers count of %j', (followersCount) => {
    expect(followStateSchema.safeParse({ isFollowing: false, followersCount }).success).toBe(false);
  });
});

describe('followListUserSchema', () => {
  it('requires whether the viewer follows the user', () => {
    const user = {
      id: '019a0000-0000-7000-8000-000000000001',
      username: 'ana_codes',
      displayName: 'Ana',
      avatarUrl: null,
    };

    expect(followListUserSchema.safeParse(user).success).toBe(false);
    expect(followListUserSchema.parse({ ...user, isFollowing: true })).toEqual({
      ...user,
      isFollowing: true,
    });
  });
});
