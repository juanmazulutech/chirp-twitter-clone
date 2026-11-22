import { pageQuerySchema, pageSchema, tweetSchema } from '@chirp/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { currentUser } from '../../plugins/session';
import { createTimelineService } from './service';

const timelineRoutes: FastifyPluginAsyncZod = async (app) => {
  const timeline = createTimelineService({ prisma: app.prisma });

  app.get(
    '/timeline',
    {
      onRequest: app.requireAuth,
      schema: { querystring: pageQuerySchema, response: { 200: pageSchema(tweetSchema) } },
    },
    async (request) => timeline.home(currentUser(request).id, request.query),
  );
};

export default timelineRoutes;
