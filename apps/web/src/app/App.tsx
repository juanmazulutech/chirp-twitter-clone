import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { createAppQueryClient } from './app-query-client';
import { AppProviders } from './providers';
import { routes } from './routes';

// Created once, outside React, as React Router requires for data routers.
const router = createBrowserRouter(routes);
const queryClient = createAppQueryClient();

export function App() {
  return (
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
