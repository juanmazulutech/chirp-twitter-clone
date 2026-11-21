import type { RouteObject } from 'react-router';

import { WelcomePage } from './WelcomePage';

/** Route table, shared by the browser router and the memory router used in tests. */
export const routes: RouteObject[] = [{ path: '/', element: <WelcomePage /> }];
