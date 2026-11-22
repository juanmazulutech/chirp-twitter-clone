import type { Like, PrismaClient, Tweet, User } from '../../src/generated/prisma/client';

/** Makes `user` like `tweet`. */
export async function createLike(
  prisma: PrismaClient,
  user: Pick<User, 'id'>,
  tweet: Pick<Tweet, 'id'>,
): Promise<Like> {
  return prisma.like.create({ data: { userId: user.id, tweetId: tweet.id } });
}
