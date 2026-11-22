import type { QueryClient } from '@tanstack/react-query';

import { authKeys } from './keys';

/**
 * Records that the session is gone, without asking `/auth/me` again: a 401 from any request
 * already says so. Every component reading the session updates at once.
 */
export function clearSession(queryClient: QueryClient): void {
  queryClient.setQueryData(authKeys.session, null);
}
