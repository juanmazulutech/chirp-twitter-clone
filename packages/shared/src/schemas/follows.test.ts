import { describe, expect, it } from 'vitest';

import { followStateSchema } from './follows';

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
