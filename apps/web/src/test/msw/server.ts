import { setupServer } from 'msw/node';

import { baseHandlers } from './handlers';

/**
 * Network mock for component tests. Every test starts signed in (`baseHandlers`); tests add
 * or override handlers with `server.use(...)`. Any request without a handler fails the test.
 */
export const server = setupServer(...baseHandlers);
