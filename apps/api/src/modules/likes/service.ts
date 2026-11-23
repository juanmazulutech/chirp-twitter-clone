import type { FollowListUser, LikeState, Page, PageQuery } from '@chirp/shared';

import type { PrismaClient } from '../../generated/prisma/client';
import { decodeCursor, keysetAfterBy, newestFirstBy, toPage } from '../../lib/cursor';
import { NotFoundError } from '../../lib/errors';
import { isForeignKeyViolation } from '../../lib/prisma-errors';
import { followListUserRowSelect, toFollowListUser } from '../../lib/serializers';
import type { StorageService } from '../../lib/storage';
import { notifyLike, retractLike } from '../notifications/rules';

export interface LikesServiceDependencies {
  prisma: PrismaClient;
  storage: Pick<StorageService, 'publicUrl'>;
}

export type LikesService = ReturnType<typeof createLikesService>;

export function createLikesService({ prisma, storage }: LikesServiceDependencies) {
  const publicUrl = (key: string) => storage.publicUrl(key);

  /** The tweet's author, who receives the like notification. */
  async function findAuthorId(tweetId: string): Promise<string> {
    const tweet = await prisma.tweet.findUnique({
      where: { id: tweetId },
      select: { authorId: true },
    });
    if (!tweet) throw new NotFoundError('Tweet');
    return tweet.authorId;
  }

  async function stateOf(tweetId: string, liked: boolean): Promise<LikeState> {
    return { liked, likeCount: await prisma.like.count({ where: { tweetId } }) };
  }

  /** Idempotent: liking a tweet already liked changes nothing and still succeeds. */
  async function like(userId: string, tweetId: string): Promise<LikeState> {
    const authorId = await findAuthorId(tweetId);
    try {
      await prisma.$transaction(async (tx) => {
        // ON CONFLICT DO NOTHING: a repeated or concurrent like never raises a unique violation.
        await tx.like.createMany({ data: { userId, tweetId }, skipDuplicates: true });
        await notifyLike(tx, { likerId: userId, tweetId, authorId });
      });
    } catch (error) {
      // The tweet was deleted between the lookup and the insert.
      if (isForeignKeyViolation(error)) throw new NotFoundError('Tweet', { cause: error });
      throw error;
    }
    return stateOf(tweetId, true);
  }

  /** Idempotent: unliking a tweet not liked changes nothing and still succeeds. */
  async function unlike(userId: string, tweetId: string): Promise<LikeState> {
    await findAuthorId(tweetId);
    await prisma.$transaction(async (tx) => {
      await tx.like.deleteMany({ where: { userId, tweetId } });
      await retractLike(tx, { likerId: userId, tweetId });
    });
    return stateOf(tweetId, false);
  }

  /**
   * Everyone who liked a chirp, most recent like first, as a follow list: the viewer can follow
   * them from there. Pages break ties on the liker's id, so the cursor is `(like.createdAt, userId)`.
   */
  async function likers(
    viewerId: string,
    tweetId: string,
    { cursor, limit }: PageQuery,
  ): Promise<Page<FollowListUser>> {
    // Decoded first, so a bad cursor is a 400 whether or not the chirp exists.
    const after = cursor === undefined ? undefined : decodeCursor(cursor);
    await findAuthorId(tweetId);
    const rows = await prisma.like.findMany({
      where: { AND: [{ tweetId }, keysetAfterBy(after, 'userId')] },
      orderBy: newestFirstBy('userId'),
      take: limit + 1,
      select: {
        createdAt: true,
        userId: true,
        user: { select: followListUserRowSelect(viewerId) },
      },
    });
    return toPage(
      rows,
      limit,
      (row) => toFollowListUser(row.user, publicUrl),
      (row) => ({ createdAt: row.createdAt, id: row.userId }),
    );
  }

  return { like, unlike, likers };
}
