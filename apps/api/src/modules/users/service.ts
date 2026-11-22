import type { Page, PageQuery, Tweet, UpdateProfileBody, UserProfile } from '@chirp/shared';

import type { PrismaClient } from '../../generated/prisma/client';
import { decodeCursor, keysetAfter, newestFirst, toPage } from '../../lib/cursor';
import { NotFoundError } from '../../lib/errors';
import {
  toTweet,
  toUserProfile,
  tweetRowSelect,
  userProfileRowSelect,
} from '../../lib/serializers';
import type { StorageService } from '../../lib/storage';

export interface UsersServiceDependencies {
  prisma: PrismaClient;
  storage: Pick<StorageService, 'publicUrl'>;
}

export type UsersService = ReturnType<typeof createUsersService>;

export function createUsersService({ prisma, storage }: UsersServiceDependencies) {
  async function profile(viewerId: string, username: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { username },
      select: userProfileRowSelect(viewerId),
    });
    if (!user) throw new NotFoundError('User');
    return toUserProfile(user, viewerId);
  }

  /** Only the fields sent change; an empty body returns the profile untouched. */
  async function updateProfile(userId: string, changes: UpdateProfileBody): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: changes,
      select: userProfileRowSelect(userId),
    });
    return toUserProfile(user, userId);
  }

  /** One user's chirps, newest first, with the viewer's likes (ADR-11, ADR-13). */
  async function tweets(
    viewerId: string,
    username: string,
    { cursor, limit }: PageQuery,
  ): Promise<Page<Tweet>> {
    // Decoded first, so a bad cursor is a 400 whether or not the user exists.
    const after = cursor === undefined ? undefined : decodeCursor(cursor);
    const author = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!author) throw new NotFoundError('User');

    const rows = await prisma.tweet.findMany({
      where: { AND: [{ authorId: author.id }, keysetAfter(after)] },
      orderBy: newestFirst,
      take: limit + 1,
      select: tweetRowSelect(viewerId),
    });
    return toPage(rows, limit, (row) => toTweet(row, (key) => storage.publicUrl(key)));
  }

  return { profile, updateProfile, tweets };
}
