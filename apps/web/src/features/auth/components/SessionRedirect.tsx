import { Navigate } from 'react-router';

import { useRouteSession } from '../hooks';
import { SessionPending } from './SessionPending';

/** The root address: the timeline when signed in, sign-in otherwise. */
export function SessionRedirect() {
  const { user, isPending } = useRouteSession();

  if (isPending) return <SessionPending />;
  return <Navigate to={user ? '/home' : '/login'} replace />;
}
