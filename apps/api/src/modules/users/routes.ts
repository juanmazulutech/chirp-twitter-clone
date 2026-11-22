import {
  pageQuerySchema,
  pageSchema,
  tweetSchema,
  updateProfileBodySchema,
  usernameParamsSchema,
  userProfileSchema,
} from '@chirp/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { currentUser } from '../../plugins/session';
import { createUsersService } from './service';

const usersRoutes: FastifyPluginAsyncZod = async (app) => {
  const users = createUsersService({ prisma: app.prisma });

  app.get(
    '/users/:username',
    {
      onRequest: app.requireAuth,
      schema: { params: usernameParamsSchema, response: { 200: userProfileSchema } },
    },
    async (request) => users.profile(currentUser(request).id, request.params.username),
  );

  app.patch(
    '/users/me',
    {
      onRequest: app.requireAuth,
      schema: { body: updateProfileBodySchema, response: { 200: userProfileSchema } },
    },
    async (request) => users.updateProfile(currentUser(request).id, request.body),
  );

  app.get(
    '/users/:username/tweets',
    {
      onRequest: app.requireAuth,
      schema: {
        params: usernameParamsSchema,
        querystring: pageQuerySchema,
        response: { 200: pageSchema(tweetSchema) },
      },
    },
    async (request) =>
      users.tweets(currentUser(request).id, request.params.username, request.query),
  );
};

export default usersRoutes;
