import { Navigate, type RouteObject } from 'react-router';

import { AppShell } from './layout/AppShell';
import { RouteErrorPage } from './layout/RouteErrorPage';
import { RouteFallback } from './layout/RouteFallback';

/** Development-only routes, loaded on demand and stripped from production builds. */
const developmentRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/styleguide',
        lazy: async () => ({ Component: (await import('./StyleguidePage')).StyleguidePage }),
      },
    ]
  : [];

/**
 * Route table, shared by the browser router and the memory router used in tests.
 * Every page is code-split with `lazy`, so a screen's code loads when it is first visited;
 * the router loads the matched routes' modules in parallel. Static segments outrank
 * `/:username`, which is why those names are reserved (`RESERVED_USERNAMES`).
 */
export const routes: RouteObject[] = [
  {
    hydrateFallbackElement: <RouteFallback />,
    errorElement: (
      <main>
        <RouteErrorPage />
      </main>
    ),
    children: [
      // Becomes session-aware (home or sign-in) with the route guards in C20.
      { path: '/', element: <Navigate to="/home" replace /> },
      {
        path: '/login',
        lazy: async () => ({
          Component: (await import('@/features/auth/pages/LoginPage')).LoginPage,
        }),
      },
      {
        path: '/register',
        lazy: async () => ({
          Component: (await import('@/features/auth/pages/RegisterPage')).RegisterPage,
        }),
      },
      ...developmentRoutes,
      {
        element: <AppShell />,
        children: [
          {
            // Errors render inside the shell, so navigation stays usable.
            errorElement: <RouteErrorPage />,
            children: [
              {
                path: '/home',
                lazy: async () => ({
                  Component: (await import('@/features/tweets/pages/HomePage')).HomePage,
                }),
              },
              {
                path: '/search',
                lazy: async () => ({
                  Component: (await import('@/features/search/pages/SearchPage')).SearchPage,
                }),
              },
              {
                path: '/notifications',
                lazy: async () => ({
                  Component: (await import('@/features/notifications/pages/NotificationsPage'))
                    .NotificationsPage,
                }),
              },
              {
                path: '/:username',
                lazy: async () => ({
                  Component: (await import('@/features/profile/pages/ProfilePage')).ProfilePage,
                }),
              },
              {
                path: '/:username/followers',
                lazy: async () => ({
                  Component: (await import('@/features/profile/pages/FollowListPage'))
                    .FollowersPage,
                }),
              },
              {
                path: '/:username/following',
                lazy: async () => ({
                  Component: (await import('@/features/profile/pages/FollowListPage'))
                    .FollowingPage,
                }),
              },
              {
                path: '*',
                lazy: async () => ({
                  Component: (await import('./layout/NotFoundPage')).NotFoundPage,
                }),
              },
            ],
          },
        ],
      },
    ],
  },
];
