import type {
  FollowListUser,
  SessionUser,
  Tweet as TweetDto,
  UserProfile,
  UserSummary,
} from '@chirp/shared';

import type { Prisma, Tweet, User } from '../generated/prisma/client';

type UserSummaryRow = Pick<User, 'id' | 'username' | 'displayName' | 'avatarKey'>;

/** Turns a stored object key into the URL the browser loads it from (`StorageService.publicUrl`). */
export type PublicUrl = (key: string) => string;

/** The columns every embedded user summary needs (an author, a follow-list row). */
const userSummarySelect = {
  id: true,
  username: true,
  displayName: true,
  avatarKey: true,
} as const satisfies Prisma.UserSelect;

/**
 * A tweet row with the author fields its DTO embeds, its like count and, in `likes`,
 * the viewer's own like when there is one.
 */
export type TweetRow = Pick<Tweet, 'id' | 'content' | 'imageKey' | 'createdAt'> & {
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
    imageKey: true,
    createdAt: true,
    author: { select: userSummarySelect },
    _count: { select: { likes: true } },
    likes: { where: { userId: viewerId }, select: { userId: true }, take: 1 },
  } as const satisfies Prisma.TweetSelect;
}

/** Database rows become API DTOs only here, so internal fields never leak by accident. */
export function toUserSummary(user: UserSummaryRow, publicUrl: PublicUrl): UserSummary {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    // Without a picture the client renders initials.
    avatarUrl: user.avatarKey === null ? null : publicUrl(user.avatarKey),
  };
}

export function toSessionUser(user: User, publicUrl: PublicUrl): SessionUser {
  return {
    ...toUserSummary(user, publicUrl),
    email: user.email,
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toTweet(tweet: TweetRow, publicUrl: PublicUrl): TweetDto {
  return {
    id: tweet.id,
    content: tweet.content,
    imageUrl: tweet.imageKey === null ? null : publicUrl(tweet.imageKey),
    createdAt: tweet.createdAt.toISOString(),
    author: toUserSummary(tweet.author, publicUrl),
    likeCount: tweet._count.likes,
    likedByMe: tweet.likes.length > 0,
  };
}

/**
 * A user row with its counts and, in `followers`, the viewer's own follow when there is one.
 */
export type UserProfileRow = UserSummaryRow &
  Pick<User, 'bio' | 'createdAt'> & {
    _count: { followers: number; following: number; tweets: number };
    followers: Array<{ followerId: string }>;
  };

/** Selects exactly the columns of a `UserProfileRow` for `viewerId`. */
export function userProfileRowSelect(viewerId: string) {
  return {
    ...userSummarySelect,
    bio: true,
    createdAt: true,
    _count: { select: { followers: true, following: true, tweets: true } },
    followers: { where: { followerId: viewerId }, select: { followerId: true }, take: 1 },
  } as const satisfies Prisma.UserSelect;
}

export function toUserProfile(
  user: UserProfileRow,
  viewerId: string,
  publicUrl: PublicUrl,
): UserProfile {
  return {
    ...toUserSummary(user, publicUrl),
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
    followersCount: user._count.followers,
    followingCount: user._count.following,
    tweetsCount: user._count.tweets,
    isFollowing: user.followers.length > 0,
    isMe: user.id === viewerId,
  };
}

/** A user in a follow list, with the viewer's own follow of them when there is one. */
export type FollowListUserRow = UserSummaryRow & { followers: Array<{ followerId: string }> };

/** Selects exactly the columns of a `FollowListUserRow` for `viewerId`. */
export function followListUserRowSelect(viewerId: string) {
  return {
    ...userSummarySelect,
    followers: { where: { followerId: viewerId }, select: { followerId: true }, take: 1 },
  } as const satisfies Prisma.UserSelect;
}

export function toFollowListUser(user: FollowListUserRow, publicUrl: PublicUrl): FollowListUser {
  return { ...toUserSummary(user, publicUrl), isFollowing: user.followers.length > 0 };
}
