import type { FastifyPluginAsync } from 'fastify';

import authRoutes from './auth/routes';
import followsRoutes from './follows/routes';
import healthRoutes from './health/routes';
import timelineRoutes from './timeline/routes';
import tweetsRoutes from './tweets/routes';

/**
 * Registers every feature module under the `/api` prefix.
 * Each feature adds one line here when it is introduced.
 */
const modules: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(tweetsRoutes);
  await app.register(followsRoutes);
  await app.register(timelineRoutes);
};

export default modules;
