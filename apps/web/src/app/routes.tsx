import type { RouteObject } from 'react-router';

import { WelcomePage } from './WelcomePage';

/** Development-only routes, loaded on demand and stripped from production builds. */
const developmentRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/styleguide',
        lazy: async () => ({ Component: (await import('./StyleguidePage')).StyleguidePage }),
      },
    ]
  : [];

/** Route table, shared by the browser router and the memory router used in tests. */
export const routes: RouteObject[] = [
  { path: '/', element: <WelcomePage /> },
  ...developmentRoutes,
];
