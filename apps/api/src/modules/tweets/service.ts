import type { CreateTweetBody, Tweet } from '@chirp/shared';

import type { PrismaClient } from '../../generated/prisma/client';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { toTweet, tweetRowSelect } from '../../lib/serializers';

export interface TweetsServiceDependencies {
  prisma: PrismaClient;
}

export type TweetsService = ReturnType<typeof createTweetsService>;

export function createTweetsService({ prisma }: TweetsServiceDependencies) {
  async function create(authorId: string, { content }: CreateTweetBody): Promise<Tweet> {
    const tweet = await prisma.tweet.create({
      data: { authorId, content },
      select: tweetRowSelect(authorId),
    });
    return toTweet(tweet);
  }

  async function get(id: string, viewerId: string): Promise<Tweet> {
    const tweet = await prisma.tweet.findUnique({
      where: { id },
      select: tweetRowSelect(viewerId),
    });
    if (!tweet) throw new NotFoundError('Tweet');
    return toTweet(tweet);
  }

  /** Only the author may delete a tweet; a missing tweet is reported before ownership. */
  async function remove(id: string, userId: string): Promise<void> {
    const tweet = await prisma.tweet.findUnique({ where: { id }, select: { authorId: true } });
    if (!tweet) throw new NotFoundError('Tweet');
    if (tweet.authorId !== userId) throw new ForbiddenError('You can only delete your own chirps');

    // deleteMany tolerates a concurrent delete of the same tweet instead of throwing P2025.
    await prisma.tweet.deleteMany({ where: { id, authorId: userId } });
  }

  return { create, get, remove };
}
