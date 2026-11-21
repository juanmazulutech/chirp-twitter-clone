import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { AppProviders } from '@/app/providers';
import { routes as appRoutes } from '@/app/routes';

interface RenderRouteOptions {
  /** Defaults to the application's route table. */
  routes?: RouteObject[];
}

/** Renders the app at `path` with a fresh query client and an in-memory router. */
export function renderRoute(path: string, { routes = appRoutes }: RenderRouteOptions = {}) {
  // No retries: a failed request should surface immediately in tests.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return {
    router,
    queryClient,
    ...render(
      <AppProviders queryClient={queryClient}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}
