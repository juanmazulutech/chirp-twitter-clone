import { setupServer } from 'msw/node';

/**
 * Network mock for component tests. Tests register the handlers they need with
 * `server.use(...)`; any request without a handler fails the test.
 */
export const server = setupServer();
