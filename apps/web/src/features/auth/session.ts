import type { QueryClient } from '@tanstack/react-query';

import { fetchSession } from './api';
import { authKeys } from './keys';

/**
 * Records that the session is gone, without asking `/auth/me` again: a 401 from any request
 * already says so. Every component reading the session updates at once.
 */
export function clearSession(queryClient: QueryClient): void {
  queryClient.setQueryData(authKeys.session, null);
}

/**
 * Loads the session the server just created. Awaited before leaving the sign-in screens, so
 * the app shell never shows a signed-out frame (the cached session may still say `null`).
 */
export async function refreshSession(queryClient: QueryClient): Promise<void> {
  await queryClient.fetchQuery({
    queryKey: authKeys.session,
    queryFn: ({ signal }) => fetchSession(signal),
    staleTime: 0,
  });
}
