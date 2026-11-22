import type { LikeState } from '@chirp/shared';

import type { PrismaClient } from '../../generated/prisma/client';
import { NotFoundError } from '../../lib/errors';
import { isForeignKeyViolation } from '../../lib/prisma-errors';

export interface LikesServiceDependencies {
  prisma: PrismaClient;
}

export type LikesService = ReturnType<typeof createLikesService>;

export function createLikesService({ prisma }: LikesServiceDependencies) {
  async function ensureTweetExists(tweetId: string): Promise<void> {
    const tweet = await prisma.tweet.findUnique({ where: { id: tweetId }, select: { id: true } });
    if (!tweet) throw new NotFoundError('Tweet');
  }

  async function stateOf(tweetId: string, liked: boolean): Promise<LikeState> {
    return { liked, likeCount: await prisma.like.count({ where: { tweetId } }) };
  }

  /** Idempotent: liking a tweet already liked changes nothing and still succeeds. */
  async function like(userId: string, tweetId: string): Promise<LikeState> {
    await ensureTweetExists(tweetId);
    try {
      // ON CONFLICT DO NOTHING: a repeated or concurrent like never raises a unique violation.
      await prisma.like.createMany({ data: { userId, tweetId }, skipDuplicates: true });
    } catch (error) {
      // The tweet was deleted between the lookup and the insert.
      if (isForeignKeyViolation(error)) throw new NotFoundError('Tweet', { cause: error });
      throw error;
    }
    return stateOf(tweetId, true);
  }

  /** Idempotent: unliking a tweet not liked changes nothing and still succeeds. */
  async function unlike(userId: string, tweetId: string): Promise<LikeState> {
    await ensureTweetExists(tweetId);
    await prisma.like.deleteMany({ where: { userId, tweetId } });
    return stateOf(tweetId, false);
  }

  return { like, unlike };
}
