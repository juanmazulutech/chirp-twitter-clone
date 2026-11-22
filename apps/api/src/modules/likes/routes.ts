import { likeStateSchema, tweetParamsSchema } from '@chirp/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { currentUser } from '../../plugins/session';
import { createLikesService } from './service';

const likesRoutes: FastifyPluginAsyncZod = async (app) => {
  const likes = createLikesService({ prisma: app.prisma });
  const schema = { params: tweetParamsSchema, response: { 200: likeStateSchema } };

  app.post('/tweets/:id/like', { onRequest: app.requireAuth, schema }, async (request) =>
    likes.like(currentUser(request).id, request.params.id),
  );

  app.delete('/tweets/:id/like', { onRequest: app.requireAuth, schema }, async (request) =>
    likes.unlike(currentUser(request).id, request.params.id),
  );
};

export default likesRoutes;
