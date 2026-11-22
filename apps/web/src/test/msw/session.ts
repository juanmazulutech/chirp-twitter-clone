import type { SessionUser } from '@chirp/shared';

import { sessionUser } from '../fixtures';
import { signedIn, signedOut } from './handlers';
import { server } from './server';

/**
 * Starts the test signed out. `signIn()` plays the part of the session cookie: from then on
 * `/auth/me` answers with the user, as it would after a real sign-in.
 */
export function startSignedOut() {
  server.use(signedOut());
  return {
    signIn(user: SessionUser = sessionUser) {
      server.use(signedIn(user));
    },
  };
}
