import fp from 'fastify-plugin';

import type { PrismaClient } from '../generated/prisma/client';
import { createPrismaClient } from '../lib/prisma-client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export interface PrismaPluginOptions {
  databaseUrl: string;
}

/** Exposes a Prisma client as `app.prisma` and disconnects it when the app closes. */
export default fp<PrismaPluginOptions>(
  async (app, { databaseUrl }) => {
    const prisma = createPrismaClient(databaseUrl);

    app.decorate('prisma', prisma);
    app.addHook('onClose', async () => {
      await prisma.$disconnect();
    });
  },
  { name: 'prisma', fastify: '5.x' },
);
