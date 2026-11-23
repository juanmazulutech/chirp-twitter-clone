import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { resetDatabase } from '../../../test/database';
import { createTweet } from '../../../test/factories/tweets';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import type { PrismaClient } from '../../generated/prisma/client';
import { NotFoundError } from '../../lib/errors';
import { createLikesService } from './service';

describe('likes service', () => {
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

  it('reports a tweet deleted between the lookup and the insert as not found', async () => {
    const ana = await createUser(app.prisma);
    const tweet = await createTweet(app.prisma, await createUser(app.prisma));
    // A real database with a query hook, so the race happens at a deterministic point.
    const racingPrisma = app.prisma.$extends({
      query: {
        like: {
          async createMany({ args, query }) {
            await app.prisma.tweet.delete({ where: { id: tweet.id } });
            return query(args);
          },
        },
      },
    }) as unknown as PrismaClient;

    const likes = createLikesService({ prisma: racingPrisma, storage: app.storage });

    await expect(likes.like(ana.id, tweet.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await app.prisma.like.count()).toBe(0);
  });
});
