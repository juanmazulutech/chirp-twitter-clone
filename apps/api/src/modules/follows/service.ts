import type { FollowState } from '@chirp/shared';

import type { PrismaClient } from '../../generated/prisma/client';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { isForeignKeyViolation } from '../../lib/prisma-errors';

export interface FollowsServiceDependencies {
  prisma: PrismaClient;
}

export type FollowsService = ReturnType<typeof createFollowsService>;

export function createFollowsService({ prisma }: FollowsServiceDependencies) {
  async function findUserId(username: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) throw new NotFoundError('User');
    return user.id;
  }

  async function stateOf(followingId: string, isFollowing: boolean): Promise<FollowState> {
    return { isFollowing, followersCount: await prisma.follow.count({ where: { followingId } }) };
  }

  /** Idempotent: following someone already followed changes nothing and still succeeds. */
  async function follow(followerId: string, username: string): Promise<FollowState> {
    const followingId = await findUserId(username);
    if (followingId === followerId) throw new ValidationError('You cannot follow yourself');

    try {
      // ON CONFLICT DO NOTHING: a repeated or concurrent follow never raises a unique violation.
      await prisma.follow.createMany({ data: { followerId, followingId }, skipDuplicates: true });
    } catch (error) {
      // The user was deleted between the lookup and the insert.
      if (isForeignKeyViolation(error)) throw new NotFoundError('User', { cause: error });
      throw error;
    }
    return stateOf(followingId, true);
  }

  /** Idempotent: unfollowing someone not followed changes nothing and still succeeds. */
  async function unfollow(followerId: string, username: string): Promise<FollowState> {
    const followingId = await findUserId(username);
    await prisma.follow.deleteMany({ where: { followerId, followingId } });
    return stateOf(followingId, false);
  }

  return { follow, unfollow };
}
