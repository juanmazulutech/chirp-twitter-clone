import { PrismaPg } from '@prisma/adapter-pg';
import fp from 'fastify-plugin';

import { PrismaClient } from '../generated/prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export interface PrismaPluginOptions {
  databaseUrl: string;
}

/**
 * Exposes a Prisma client as `app.prisma` and disconnects it when the app closes.
 * Prisma 7 requires a driver adapter; connections are opened lazily on first query.
 */
export default fp<PrismaPluginOptions>(
  async (app, { databaseUrl }) => {
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

    app.decorate('prisma', prisma);
    app.addHook('onClose', async () => {
      await prisma.$disconnect();
    });
  },
  { name: 'prisma', fastify: '5.x' },
);
