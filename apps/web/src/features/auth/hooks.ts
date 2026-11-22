import { useQuery } from '@tanstack/react-query';

import { fetchSession } from './api';
import { authKeys } from './keys';

/**
 * The signed-in user (`null` when signed out). One request serves every component that
 * asks; it stays fresh until a 401 clears it or the user signs in or out.
 */
export function useSession() {
  const query = useQuery({
    queryKey: authKeys.session,
    queryFn: ({ signal }) => fetchSession(signal),
    staleTime: Infinity,
  });
  return { user: query.data ?? null, isPending: query.isPending, isError: query.isError };
}
