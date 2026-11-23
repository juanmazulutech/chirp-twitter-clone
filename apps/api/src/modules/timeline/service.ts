import type { Page, PageQuery, Tweet } from '@chirp/shared';

import type { PrismaClient } from '../../generated/prisma/client';
import { decodeCursor, keysetAfter, newestFirst, toPage } from '../../lib/cursor';
import { toTweet, tweetRowSelect } from '../../lib/serializers';
import type { StorageService } from '../../lib/storage';

export interface TimelineServiceDependencies {
  prisma: PrismaClient;
  storage: Pick<StorageService, 'publicUrl'>;
}

export type TimelineService = ReturnType<typeof createTimelineService>;

export function createTimelineService({ prisma, storage }: TimelineServiceDependencies) {
  /**
   * The viewer's own top-level chirps and those of everyone they follow, computed at read time
   * (ADR-12, ADR-24).
   */
  async function home(viewerId: string, { cursor, limit }: PageQuery): Promise<Page<Tweet>> {
    const after = cursor === undefined ? undefined : decodeCursor(cursor);

    const rows = await prisma.tweet.findMany({
      where: {
        AND: [
          // Replies are read in their thread, not in the timeline (ADR-24).
          { parentId: null },
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
      select: tweetRowSelect(viewerId),
    });
    return toPage(rows, limit, (row) => toTweet(row, (key) => storage.publicUrl(key)));
  }

  return { home };
}
