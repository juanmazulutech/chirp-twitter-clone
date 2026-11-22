import type { SessionUser } from '@chirp/shared';

/** The signed-in user the base handlers answer with, unless a test says otherwise. */
export const sessionUser: SessionUser = {
  id: '0f6f8f8e-2d4b-4c7a-9a51-3d2b6c1e7a10',
  username: 'ana_codes',
  displayName: 'Ana Torres',
  avatarUrl: null,
  email: 'ana@chirp.dev',
  bio: 'Writes code, reads poetry.',
  createdAt: '2026-11-01T09:30:00.000Z',
};

/** What `POST /auth/login` and `/auth/register` answer with for `sessionUser`. */
export const authResponse = {
  user: {
    id: sessionUser.id,
    username: sessionUser.username,
    displayName: sessionUser.displayName,
    avatarUrl: sessionUser.avatarUrl,
  },
};
