import { render } from '@testing-library/react';
import { createMemoryRouter, type RouteObject } from 'react-router';

import { createAppQueryClient } from '@/app/app-query-client';
import { AppRouter } from '@/app/AppRouter';
import { AppProviders } from '@/app/providers';
import { routes as appRoutes } from '@/app/routes';

interface RenderRouteOptions {
  /** Defaults to the application's route table. */
  routes?: RouteObject[];
}

/** Renders the app at `path` with a fresh query client and an in-memory router. */
export function renderRoute(path: string, { routes = appRoutes }: RenderRouteOptions = {}) {
  // The app's own client (global 401 handling included), minus retries: a failed request
  // should surface immediately in tests.
  const queryClient = createAppQueryClient();
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return {
    router,
    queryClient,
    ...render(
      <AppProviders queryClient={queryClient}>
        <AppRouter router={router} />
      </AppProviders>,
    ),
  };
}
