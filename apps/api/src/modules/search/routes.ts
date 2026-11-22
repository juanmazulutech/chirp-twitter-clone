import { followListUserSchema, pageSchema, userSearchQuerySchema } from '@chirp/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { currentUser } from '../../plugins/session';
import { createSearchService } from './service';

const searchRoutes: FastifyPluginAsyncZod = async (app) => {
  const search = createSearchService({ prisma: app.prisma });

  // A static path, so it wins over `/users/:username` ("search" is a reserved username).
  app.get(
    '/users/search',
    {
      onRequest: app.requireAuth,
      schema: {
        querystring: userSearchQuerySchema,
        response: { 200: pageSchema(followListUserSchema) },
      },
    },
    async (request) => search.users(currentUser(request).id, request.query),
  );
};

export default searchRoutes;
