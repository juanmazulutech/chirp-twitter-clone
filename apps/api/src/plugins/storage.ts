import fp from 'fastify-plugin';

import type { StorageService } from '../lib/storage';

declare module 'fastify' {
  interface FastifyInstance {
    storage: StorageService;
  }
}

export interface StoragePluginOptions {
  storage: StorageService;
}

/** Exposes the storage driver as `app.storage` and releases it when the app closes. */
export default fp<StoragePluginOptions>(
  async (app, { storage }) => {
    app.decorate('storage', storage);
    app.addHook('onClose', async () => {
      await storage.close();
    });
  },
  { name: 'storage', fastify: '5.x' },
);
