import {
  followListUserSchema,
  followStateSchema,
  pageQuerySchema,
  pageSchema,
  usernameParamsSchema,
} from '@chirp/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { currentUser } from '../../plugins/session';
import { createFollowsService } from './service';

const followsRoutes: FastifyPluginAsyncZod = async (app) => {
  const follows = createFollowsService({ prisma: app.prisma });
  const schema = { params: usernameParamsSchema, response: { 200: followStateSchema } };

  app.post('/users/:username/follow', { onRequest: app.requireAuth, schema }, async (request) =>
    follows.follow(currentUser(request).id, request.params.username),
  );

  app.delete('/users/:username/follow', { onRequest: app.requireAuth, schema }, async (request) =>
    follows.unfollow(currentUser(request).id, request.params.username),
  );

  const listSchema = {
    params: usernameParamsSchema,
    querystring: pageQuerySchema,
    response: { 200: pageSchema(followListUserSchema) },
  };

  app.get(
    '/users/:username/followers',
    { onRequest: app.requireAuth, schema: listSchema },
    async (request) =>
      follows.followers(currentUser(request).id, request.params.username, request.query),
  );

  app.get(
    '/users/:username/following',
    { onRequest: app.requireAuth, schema: listSchema },
    async (request) =>
      follows.following(currentUser(request).id, request.params.username, request.query),
  );
};

export default followsRoutes;
