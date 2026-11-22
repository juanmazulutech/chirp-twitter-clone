import { describe, expect, it } from 'vitest';

import { likeStateSchema } from './likes';

describe('likeStateSchema', () => {
  it('accepts a like state', () => {
    expect(likeStateSchema.parse({ liked: true, likeCount: 3 })).toEqual({
      liked: true,
      likeCount: 3,
    });
  });

  it.each([-1, 1.5])('rejects a like count of %j', (likeCount) => {
    expect(likeStateSchema.safeParse({ liked: false, likeCount }).success).toBe(false);
  });
});
