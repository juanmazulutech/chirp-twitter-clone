import type { LikeState } from '@chirp/shared';

import type { PrismaClient } from '../../generated/prisma/client';
import { NotFoundError } from '../../lib/errors';
import { isForeignKeyViolation } from '../../lib/prisma-errors';
import { notifyLike, retractLike } from '../notifications/rules';

export interface LikesServiceDependencies {
  prisma: PrismaClient;
}

export type LikesService = ReturnType<typeof createLikesService>;

export function createLikesService({ prisma }: LikesServiceDependencies) {
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

  return { like, unlike };
}
