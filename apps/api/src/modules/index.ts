import type { FastifyPluginAsync } from 'fastify';

import authRoutes from './auth/routes';
import healthRoutes from './health/routes';

/**
 * Registers every feature module under the `/api` prefix.
 * Each feature adds one line here when it is introduced.
 */
const modules: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes);
  await app.register(authRoutes);
};

export default modules;
