import type { SessionUser, Tweet as TweetDto, UserSummary } from '@chirp/shared';

import type { Prisma, Tweet, User } from '../generated/prisma/client';

type UserSummaryRow = Pick<User, 'id' | 'username' | 'displayName'>;

/**
 * A tweet row with the author fields its DTO embeds, its like count and, in `likes`,
 * the viewer's own like when there is one.
 */
export type TweetRow = Pick<Tweet, 'id' | 'content' | 'createdAt'> & {
  author: UserSummaryRow;
  _count: { likes: number };
  likes: Array<{ userId: string }>;
};

/**
 * Selects exactly the columns of a `TweetRow` for `viewerId`, in every query that returns
 * tweets. Counts are aggregated in the same query rather than stored (ADR-13).
 */
export function tweetRowSelect(viewerId: string) {
  return {
    id: true,
    content: true,
    createdAt: true,
    author: { select: { id: true, username: true, displayName: true } },
    _count: { select: { likes: true } },
    likes: { where: { userId: viewerId }, select: { userId: true }, take: 1 },
  } as const satisfies Prisma.TweetSelect;
}

/** Database rows become API DTOs only here, so internal fields never leak by accident. */
export function toUserSummary(user: UserSummaryRow): UserSummary {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    // Avatars arrive with media uploads (C41); until then the client renders initials.
    avatarUrl: null,
  };
}

export function toSessionUser(user: User): SessionUser {
  return {
    ...toUserSummary(user),
    email: user.email,
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toTweet(tweet: TweetRow): TweetDto {
  return {
    id: tweet.id,
    content: tweet.content,
    // Tweet images arrive with media uploads (Phase 7).
    imageUrl: null,
    createdAt: tweet.createdAt.toISOString(),
    author: toUserSummary(tweet.author),
    likeCount: tweet._count.likes,
    likedByMe: tweet.likes.length > 0,
  };
}
