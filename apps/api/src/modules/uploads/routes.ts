import { presignUploadBodySchema, presignUploadResponseSchema } from '@chirp/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { currentUser } from '../../plugins/session';
import { createUploadsService } from './service';

const uploadsRoutes: FastifyPluginAsyncZod = async (app) => {
  const uploads = createUploadsService({
    storage: app.storage,
    maxBytes: app.config.UPLOAD_MAX_BYTES,
  });

  app.post(
    '/uploads/presign',
    {
      onRequest: app.requireAuth,
      schema: { body: presignUploadBodySchema, response: { 200: presignUploadResponseSchema } },
    },
    async (request) => uploads.presign(currentUser(request).id, request.body),
  );
};

export default uploadsRoutes;
