import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { fetchSession, login, register } from './api';
import { authKeys } from './keys';
import { refreshSession } from './session';

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

/** Signs in, loads the session, then opens the home timeline. */
export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await refreshSession(queryClient);
      await navigate('/home', { replace: true });
    },
  });
}

/**
 * Creates the account, loads the session, then opens search: a new timeline is empty
 * until you follow someone (PRODUCT.md: sign up, find people, follow them).
 */
export function useRegister() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: register,
    onSuccess: async () => {
      await refreshSession(queryClient);
      await navigate('/search', { replace: true });
    },
  });
}
