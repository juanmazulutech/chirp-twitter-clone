import { Navigate, Outlet, useLocation } from 'react-router';

import { useRouteSession } from '../hooks';
import { returnToState } from '../return-to';
import { SessionPending } from './SessionPending';

/**
 * Signed-in pages. Without a session (never signed in, or a 401 ended it) the visitor goes
 * to sign-in, which brings them back to this page afterwards.
 */
export function ProtectedRoute() {
  const location = useLocation();
  const { user, isPending, isSigningOut } = useRouteSession();

  if (user) return <Outlet />;
  // Signing out opens sign-in itself, with no page to return to.
  if (isPending || isSigningOut) return <SessionPending />;
  return <Navigate to="/login" replace state={returnToState(location)} />;
}
