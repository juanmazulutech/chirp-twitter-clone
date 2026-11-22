import { createTweetBodySchema, tweetParamsSchema, tweetSchema } from '@chirp/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { currentUser } from '../../plugins/session';
import { createTweetsService } from './service';

const tweetsRoutes: FastifyPluginAsyncZod = async (app) => {
  const tweets = createTweetsService({ prisma: app.prisma, storage: app.storage, log: app.log });

  app.post(
    '/tweets',
    {
      onRequest: app.requireAuth,
      schema: { body: createTweetBodySchema, response: { 201: tweetSchema } },
    },
    async (request, reply) =>
      reply.code(201).send(await tweets.create(currentUser(request).id, request.body)),
  );

  app.get(
    '/tweets/:id',
    {
      onRequest: app.requireAuth,
      schema: { params: tweetParamsSchema, response: { 200: tweetSchema } },
    },
    async (request) => tweets.get(request.params.id, currentUser(request).id),
  );

  app.delete(
    '/tweets/:id',
    { onRequest: app.requireAuth, schema: { params: tweetParamsSchema } },
    async (request, reply) => {
      await tweets.remove(request.params.id, currentUser(request).id);
      return reply.code(204).send();
    },
  );
};

export default tweetsRoutes;
