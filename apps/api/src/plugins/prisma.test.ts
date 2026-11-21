import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { testDatabaseUrl } from '../../test/env';
import prismaPlugin from './prisma';

describe('prisma plugin', () => {
  it('exposes a connected client on the app instance', async () => {
    const app = Fastify({ logger: false });
    await app.register(prismaPlugin, { databaseUrl: testDatabaseUrl() });
    await app.ready();

    try {
      const [row] = await app.prisma.$queryRaw<Array<{ value: number }>>`SELECT 1 AS value`;
      expect(row?.value).toBe(1);
    } finally {
      await app.close();
    }
  });

  it('disconnects the client when the app closes', async () => {
    const app = Fastify({ logger: false });
    await app.register(prismaPlugin, { databaseUrl: testDatabaseUrl() });
    await app.ready();
    const disconnect = vi.spyOn(app.prisma, '$disconnect');

    await app.close();

    expect(disconnect).toHaveBeenCalledOnce();
  });
});
