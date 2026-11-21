import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';

import type { User } from '../generated/prisma/client';
import { UnauthenticatedError } from '../lib/errors';
import { currentUser } from './session';

describe('currentUser', () => {
  it('returns the signed-in user', () => {
    const user = { id: 'user-1' } as User;

    expect(currentUser({ user } as FastifyRequest)).toBe(user);
  });

  it('throws when the request is anonymous', () => {
    expect(() => currentUser({ user: null } as FastifyRequest)).toThrow(UnauthenticatedError);
  });
});
