import { describe, expect, it } from 'vitest';

import { USERNAME_MAX_LENGTH } from '../constants';
import { usernameParamsSchema } from './users';

describe('usernameParamsSchema', () => {
  it('normalizes the username like registration does', () => {
    expect(usernameParamsSchema.parse({ username: ' Ana_Dev ' })).toEqual({ username: 'ana_dev' });
  });

  it.each(['home', 'ab', 'not-valid'])(
    'accepts %j, which can only be reported as not found',
    (username) => {
      expect(usernameParamsSchema.safeParse({ username }).success).toBe(true);
    },
  );

  it.each(['', ' ', 'a'.repeat(USERNAME_MAX_LENGTH + 1)])('rejects %j', (username) => {
    expect(usernameParamsSchema.safeParse({ username }).success).toBe(false);
  });
});
