import { Navigate, Outlet, useLocation } from 'react-router';

import { useRouteSession } from '../hooks';
import { returnToPath } from '../return-to';
import { SessionPending } from './SessionPending';

/** Sign-in and account creation: someone already signed in goes on to the app instead. */
export function GuestRoute() {
  const location = useLocation();
  const { user, isPending, isSigningIn } = useRouteSession();

  if (isPending) return <SessionPending />;
  // Signing in picks its own destination; the form stays on screen until it gets there.
  if (!user || isSigningIn) return <Outlet />;
  return <Navigate to={returnToPath(location.state) ?? '/home'} replace />;
}
