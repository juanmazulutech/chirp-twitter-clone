import { hashKey, type QueryClient, queryOptions } from '@tanstack/react-query';

import { fetchSession } from './api';
import { authKeys } from './keys';

/**
 * The signed-in user (`null` when signed out). It stays fresh until a 401 clears it or the
 * user signs in or out, so one request serves the whole visit.
 */
export const sessionQuery = queryOptions({
  queryKey: authKeys.session,
  queryFn: ({ signal }) => fetchSession(signal),
  staleTime: Infinity,
});

/**
 * Asks for the session as soon as the app starts, so the request runs alongside the first
 * route's code instead of after it (the route guards would otherwise ask only once rendered).
 */
export function prefetchSession(queryClient: QueryClient): void {
  void queryClient.prefetchQuery(sessionQuery);
}

/**
 * Records that the session is gone, without asking `/auth/me` again: a 401 from any request
 * already says so. Every component reading the session updates at once.
 */
export function clearSession(queryClient: QueryClient): void {
  queryClient.setQueryData(authKeys.session, null);
}

const sessionHash = hashKey(authKeys.session);

/** Everything cached except the session: it belongs to whoever was signed in when it loaded. */
function removeAccountData(queryClient: QueryClient): void {
  queryClient.removeQueries({ predicate: (query) => query.queryHash !== sessionHash });
}

/**
 * Loads the session the server just created. Awaited before leaving the sign-in screens, so
 * the app shell never shows a signed-out frame. Data left from an earlier session (a 401
 * keeps it) is dropped first, so a different account never sees it.
 */
export async function startSession(queryClient: QueryClient): Promise<void> {
  removeAccountData(queryClient);
  await queryClient.fetchQuery({ ...sessionQuery, staleTime: 0 });
}

/** After signing out: nothing of the account stays in memory for the next person. */
export function endSession(queryClient: QueryClient): void {
  removeAccountData(queryClient);
  clearSession(queryClient);
}
