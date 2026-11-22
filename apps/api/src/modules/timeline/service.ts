import type { Page, PageQuery, Tweet } from '@chirp/shared';

import type { PrismaClient } from '../../generated/prisma/client';
import { decodeCursor, keysetAfter, newestFirst, toPage } from '../../lib/cursor';
import { toTweet, tweetRowSelect } from '../../lib/serializers';

export interface TimelineServiceDependencies {
  prisma: PrismaClient;
}

export type TimelineService = ReturnType<typeof createTimelineService>;

export function createTimelineService({ prisma }: TimelineServiceDependencies) {
  /** The viewer's own tweets and those of everyone they follow, computed at read time (ADR-12). */
  async function home(viewerId: string, { cursor, limit }: PageQuery): Promise<Page<Tweet>> {
    const after = cursor === undefined ? undefined : decodeCursor(cursor);

    const rows = await prisma.tweet.findMany({
      where: {
        AND: [
          {
            OR: [
              { authorId: viewerId },
              { author: { followers: { some: { followerId: viewerId } } } },
            ],
          },
          keysetAfter(after),
        ],
      },
      orderBy: newestFirst,
      take: limit + 1,
      select: tweetRowSelect,
    });
    return toPage(rows, limit, toTweet);
  }

  return { home };
}
