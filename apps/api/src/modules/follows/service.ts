import type { FollowListUser, FollowState, Page, PageQuery } from '@chirp/shared';

import type { PrismaClient } from '../../generated/prisma/client';
import { decodeCursor, keysetAfterBy, newestFirstBy, toPage } from '../../lib/cursor';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { isForeignKeyViolation } from '../../lib/prisma-errors';
import { followListUserRowSelect, toFollowListUser } from '../../lib/serializers';

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

  /**
   * Everyone who follows `username`, most recent follow first. Pages break ties on the
   * follower's id, so the cursor is `(follow.createdAt, followerId)`.
   */
  async function followers(
    viewerId: string,
    username: string,
    { cursor, limit }: PageQuery,
  ): Promise<Page<FollowListUser>> {
    // Decoded first, so a bad cursor is a 400 whether or not the user exists.
    const after = cursor === undefined ? undefined : decodeCursor(cursor);
    const followingId = await findUserId(username);
    const rows = await prisma.follow.findMany({
      where: { AND: [{ followingId }, keysetAfterBy(after, 'followerId')] },
      orderBy: newestFirstBy('followerId'),
      take: limit + 1,
      select: {
        createdAt: true,
        followerId: true,
        follower: { select: followListUserRowSelect(viewerId) },
      },
    });
    return toPage(
      rows,
      limit,
      (row) => toFollowListUser(row.follower),
      (row) => ({ createdAt: row.createdAt, id: row.followerId }),
    );
  }

  /** Everyone `username` follows, most recent follow first; cursor `(createdAt, followingId)`. */
  async function following(
    viewerId: string,
    username: string,
    { cursor, limit }: PageQuery,
  ): Promise<Page<FollowListUser>> {
    const after = cursor === undefined ? undefined : decodeCursor(cursor);
    const followerId = await findUserId(username);
    const rows = await prisma.follow.findMany({
      where: { AND: [{ followerId }, keysetAfterBy(after, 'followingId')] },
      orderBy: newestFirstBy('followingId'),
      take: limit + 1,
      select: {
        createdAt: true,
        followingId: true,
        following: { select: followListUserRowSelect(viewerId) },
      },
    });
    return toPage(
      rows,
      limit,
      (row) => toFollowListUser(row.following),
      (row) => ({ createdAt: row.createdAt, id: row.followingId }),
    );
  }

  return { follow, unfollow, followers, following };
}
