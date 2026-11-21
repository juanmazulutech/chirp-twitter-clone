import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const livenessResponseSchema = z.object({ status: z.literal('ok') });

/** Liveness: answers as long as the process can serve requests (no dependency checks). */
const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/health', { schema: { response: { 200: livenessResponseSchema } } }, async () => ({
    status: 'ok' as const,
  }));
};

export default healthRoutes;
