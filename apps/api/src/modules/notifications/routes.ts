import {
  markNotificationsReadBodySchema,
  notificationSchema,
  pageQuerySchema,
  pageSchema,
  unreadCountSchema,
} from '@chirp/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { currentUser } from '../../plugins/session';
import { createNotificationsService } from './service';

const notificationsRoutes: FastifyPluginAsyncZod = async (app) => {
  const notifications = createNotificationsService({ prisma: app.prisma, storage: app.storage });

  app.get(
    '/notifications',
    {
      onRequest: app.requireAuth,
      schema: { querystring: pageQuerySchema, response: { 200: pageSchema(notificationSchema) } },
    },
    async (request) => notifications.list(currentUser(request).id, request.query),
  );

  app.get(
    '/notifications/unread-count',
    { onRequest: app.requireAuth, schema: { response: { 200: unreadCountSchema } } },
    async (request) => notifications.unreadCount(currentUser(request).id),
  );

  app.post(
    '/notifications/read',
    { onRequest: app.requireAuth, schema: { body: markNotificationsReadBodySchema } },
    async (request, reply) => {
      await notifications.markRead(currentUser(request).id, new Date(request.body.until));
      return reply.code(204).send();
    },
  );
};

export default notificationsRoutes;
