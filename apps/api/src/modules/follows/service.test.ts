import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { resetDatabase } from '../../../test/database';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import type { PrismaClient } from '../../generated/prisma/client';
import { NotFoundError } from '../../lib/errors';
import { createFollowsService } from './service';

describe('follows service', () => {
  let app: App;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app.prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports a user deleted between the lookup and the insert as not found', async () => {
    const ana = await createUser(app.prisma);
    const bruno = await createUser(app.prisma, { username: 'bruno' });
    // A real database with a query hook, so the race happens at a deterministic point.
    const racingPrisma = app.prisma.$extends({
      query: {
        follow: {
          async createMany({ args, query }) {
            await app.prisma.user.delete({ where: { id: bruno.id } });
            return query(args);
          },
        },
      },
    }) as unknown as PrismaClient;

    const follows = createFollowsService({ prisma: racingPrisma, storage: app.storage });

    await expect(follows.follow(ana.id, 'bruno')).rejects.toBeInstanceOf(NotFoundError);
    expect(await app.prisma.follow.count()).toBe(0);
  });
});
