import type { Follow, PrismaClient, User } from '../../src/generated/prisma/client';

/** Makes `follower` follow `following`. */
export async function createFollow(
  prisma: PrismaClient,
  follower: Pick<User, 'id'>,
  following: Pick<User, 'id'>,
): Promise<Follow> {
  return prisma.follow.create({ data: { followerId: follower.id, followingId: following.id } });
}
