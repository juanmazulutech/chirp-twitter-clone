import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { resetDatabase } from '../../../test/database';
import { createTweet } from '../../../test/factories/tweets';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import type { PrismaClient } from '../../generated/prisma/client';
import { NotFoundError } from '../../lib/errors';
import { MemoryStorage } from '../../lib/memory-storage';
import { createTweetsService } from './service';

describe('tweets service', () => {
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

  const serviceWith = (prisma: PrismaClient) =>
    createTweetsService({ prisma, storage: new MemoryStorage(), log: { warn: () => undefined } });

  it('reports a parent deleted between the lookup and the insert as not found', async () => {
    const ana = await createUser(app.prisma);
    const parent = await createTweet(app.prisma, await createUser(app.prisma));
    // A real database with a query hook, so the race happens at a deterministic point.
    const racingPrisma = app.prisma.$extends({
      query: {
        tweet: {
          async create({ args, query }) {
            await app.prisma.tweet.delete({ where: { id: parent.id } });
            return query(args);
          },
        },
      },
    }) as unknown as PrismaClient;

    const tweets = serviceWith(racingPrisma);

    await expect(tweets.reply(ana.id, parent.id, { content: 'too late' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await app.prisma.tweet.count()).toBe(0);
  });

  it('rethrows a failed insert that is not a missing parent', async () => {
    const parent = await createTweet(app.prisma, await createUser(app.prisma));
    const tweets = serviceWith(app.prisma);

    // The route validates length first; called directly, the column rejects it with an error
    // that must not be mistaken for a deleted parent.
    await expect(
      tweets.reply(parent.authorId, parent.id, { content: 'a'.repeat(281) }),
    ).rejects.not.toBeInstanceOf(NotFoundError);
  });
});
