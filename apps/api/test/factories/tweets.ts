import type { Prisma, PrismaClient, Tweet, User } from '../../src/generated/prisma/client';

let sequence = 0;

/** Creates a tweet by `author` with unique content; any field can be overridden. */
export async function createTweet(
  prisma: PrismaClient,
  author: Pick<User, 'id'>,
  overrides: Partial<Omit<Prisma.TweetUncheckedCreateInput, 'authorId'>> = {},
): Promise<Tweet> {
  sequence += 1;
  return prisma.tweet.create({
    data: { authorId: author.id, content: `Test chirp ${sequence}`, ...overrides },
  });
}
