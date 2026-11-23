import type { Page, PageQuery, Tweet, UpdateProfileBody, UserProfile } from '@chirp/shared';
import type { FastifyBaseLogger } from 'fastify';

import type { PrismaClient } from '../../generated/prisma/client';
import { decodeCursor, keysetAfter, newestFirst, toPage } from '../../lib/cursor';
import { NotFoundError, ValidationError } from '../../lib/errors';
import {
  toTweet,
  toUserProfile,
  tweetRowSelect,
  userProfileRowSelect,
} from '../../lib/serializers';
import type { StorageService } from '../../lib/storage';

export interface UsersServiceDependencies {
  prisma: PrismaClient;
  storage: StorageService;
  /** Records failures that must not fail the request (a replaced picture left behind). */
  log: Pick<FastifyBaseLogger, 'warn'>;
}

export type UsersService = ReturnType<typeof createUsersService>;

const UNUSABLE_AVATAR = 'This picture can’t be used. Upload it again.';

function unusableAvatar(): ValidationError {
  return new ValidationError(UNUSABLE_AVATAR, { fieldErrors: { avatarKey: [UNUSABLE_AVATAR] } });
}

export function createUsersService({ prisma, storage, log }: UsersServiceDependencies) {
  const publicUrl = (key: string) => storage.publicUrl(key);

  async function profile(viewerId: string, username: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { username },
      select: userProfileRowSelect(viewerId),
    });
    if (!user) throw new NotFoundError('User');
    return toUserProfile(user, viewerId, publicUrl);
  }

  /**
   * Only the fields sent change; an empty body returns the profile untouched. A new picture
   * must be the user's own avatar upload and must have arrived, like chirp images (ADR-14);
   * the picture it replaces (or that `null` removes) is deleted best-effort.
   */
  async function updateProfile(userId: string, changes: UpdateProfileBody): Promise<UserProfile> {
    const { avatarKey } = changes;
    if (typeof avatarKey === 'string') {
      if (!avatarKey.startsWith(`users/${userId}/avatar/`)) throw unusableAvatar();
      if (!(await storage.exists(avatarKey))) throw unusableAvatar();
    }

    const before = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { avatarKey: true },
    });
    const user = await prisma.user.update({
      where: { id: userId },
      data: changes,
      select: userProfileRowSelect(userId),
    });

    const replaced = before.avatarKey;
    if (avatarKey !== undefined && replaced !== null && replaced !== avatarKey) {
      try {
        await storage.delete(replaced);
      } catch (error) {
        log.warn({ err: error, key: replaced }, 'Could not delete a replaced profile picture');
      }
    }
    return toUserProfile(user, userId, publicUrl);
  }

  /**
   * One user's chirps of one kind, newest first, with the viewer's likes (ADR-11, ADR-13):
   * top-level chirps or replies (ADR-24). Each reply carries `replyTo`.
   */
  async function authoredPage(
    viewerId: string,
    username: string,
    kind: 'chirps' | 'replies',
    { cursor, limit }: PageQuery,
  ): Promise<Page<Tweet>> {
    // Decoded first, so a bad cursor is a 400 whether or not the user exists.
    const after = cursor === undefined ? undefined : decodeCursor(cursor);
    const author = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!author) throw new NotFoundError('User');

    const parentId = kind === 'chirps' ? null : { not: null };
    const rows = await prisma.tweet.findMany({
      where: { AND: [{ authorId: author.id, parentId }, keysetAfter(after)] },
      orderBy: newestFirst,
      take: limit + 1,
      select: tweetRowSelect(viewerId),
    });
    return toPage(rows, limit, (row) => toTweet(row, publicUrl));
  }

  const tweets = (viewerId: string, username: string, page: PageQuery) =>
    authoredPage(viewerId, username, 'chirps', page);
  const replies = (viewerId: string, username: string, page: PageQuery) =>
    authoredPage(viewerId, username, 'replies', page);

  return { profile, updateProfile, tweets, replies };
}
