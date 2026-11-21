import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const livenessResponseSchema = z.object({ status: z.literal('ok') });

const readinessResponseSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  checks: z.object({ database: z.enum(['up', 'down']) }),
});

const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  /** Liveness: answers as long as the process can serve requests (no dependency checks). */
  app.get('/health', { schema: { response: { 200: livenessResponseSchema } } }, async () => ({
    status: 'ok' as const,
  }));

  /** Readiness: the API can serve traffic only when its dependencies respond. */
  app.get(
    '/health/ready',
    { schema: { response: { 200: readinessResponseSchema, 503: readinessResponseSchema } } },
    async (request, reply) => {
      try {
        await app.prisma.$queryRaw`SELECT 1`;
        return { status: 'ok' as const, checks: { database: 'up' as const } };
      } catch (error) {
        request.log.warn({ err: error }, 'Readiness check failed: database unreachable');
        return reply.code(503).send({ status: 'unavailable', checks: { database: 'down' } });
      }
    },
  );
};

export default healthRoutes;
