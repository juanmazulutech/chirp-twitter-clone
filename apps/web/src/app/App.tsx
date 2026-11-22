import { createBrowserRouter } from 'react-router';

import { prefetchSession } from '@/features/auth/session';

import { createAppQueryClient } from './app-query-client';
import { AppRouter } from './AppRouter';
import { AppProviders } from './providers';
import { routes } from './routes';

// Created once, outside React, as React Router requires for data routers. The session
// request starts before the router loads the first route's code, so the two run in parallel.
const queryClient = createAppQueryClient();
prefetchSession(queryClient);
const router = createBrowserRouter(routes);

export function App() {
  return (
    <AppProviders queryClient={queryClient}>
      <AppRouter router={router} />
    </AppProviders>
  );
}
