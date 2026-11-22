import type { DataRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

interface AppRouterProps {
  router: DataRouter;
}

/**
 * The router as the app renders it, shared with the tests. Navigations commit as ordinary
 * updates rather than React transitions: a transition renders after more urgent updates, so
 * signing in or out could settle (and the route guards redirect) before the new page had
 * rendered. Nothing here suspends, so transitions bought nothing in return.
 */
export function AppRouter({ router }: AppRouterProps) {
  return <RouterProvider router={router} useTransitions={false} />;
}
