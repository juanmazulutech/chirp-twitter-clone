import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';

import { notify } from '@/lib/notify';

import { login, logout, register } from './api';
import { authKeys } from './keys';
import { returnToPath } from './return-to';
import { endSession, sessionQuery, startSession } from './session';

/**
 * The signed-in user (`null` when signed out). One request serves every component that
 * asks; it stays fresh until a 401 clears it or the user signs in or out.
 */
export function useSession() {
  const query = useQuery(sessionQuery);
  return { user: query.data ?? null, isPending: query.isPending, isError: query.isError };
}

/**
 * For the route guards: the session, plus whether signing in or out is under way. Those
 * flows change the session and then navigate on their own, so while they run a guard lets
 * them land instead of racing them with a redirect of its own. That holds only if the new
 * page renders before the mutation settles, which is why `AppRouter` turns off transitions.
 * Failing to learn the session (server down, no connection) goes to the route's error page:
 * it must not look like being signed out.
 */
export function useRouteSession() {
  const { user, isPending, isError } = useSession();
  const isSigningIn = useIsMutating({ mutationKey: authKeys.signIn }) > 0;
  const isSigningOut = useIsMutating({ mutationKey: authKeys.signOut }) > 0;
  if (isError) throw new Error('The session could not be loaded');
  return { user, isPending, isSigningIn, isSigningOut };
}

/** Signs in, loads the session, then returns to the page that asked for it (or home). */
export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  return useMutation({
    mutationKey: authKeys.signIn,
    mutationFn: login,
    onSuccess: async () => {
      await startSession(queryClient);
      await navigate(returnToPath(location.state) ?? '/home', { replace: true });
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
    mutationKey: authKeys.signIn,
    mutationFn: register,
    onSuccess: async () => {
      await startSession(queryClient);
      await navigate('/search', { replace: true });
    },
  });
}

/**
 * Signs out on the server, forgets the account's data and opens the sign-in screen with no
 * page to return to: leaving was deliberate. If the server cannot be reached the session is
 * still open, so the app says so instead of pretending it ended.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationKey: authKeys.signOut,
    mutationFn: logout,
    onSuccess: async () => {
      endSession(queryClient);
      await navigate('/login', { replace: true });
    },
    onError: () => {
      notify.error('Couldn’t sign out. Check your connection and try again.');
    },
  });
}
