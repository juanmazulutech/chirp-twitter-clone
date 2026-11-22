import type { FollowListUser, Page, UserProfile } from '@chirp/shared';
import type { InfiniteData } from '@tanstack/react-query';

type FollowListPages = InfiniteData<Page<FollowListUser>, unknown>;

/** Whether cached data under `profileKeys.all` is a follow list (the rest are profiles). */
export function isFollowListPages(data: unknown): data is FollowListPages {
  return typeof data === 'object' && data !== null && 'pages' in data && Array.isArray(data.pages);
}

/** Sets whether the viewer follows `username` in every row for them; other pages keep identity. */
export function withFollowInPages<T extends FollowListPages>(
  data: T,
  username: string,
  following: boolean,
): T {
  return {
    ...data,
    pages: data.pages.map((page) =>
      page.items.some((user) => user.username === username && user.isFollowing !== following)
        ? {
            ...page,
            items: page.items.map((user) =>
              user.username === username ? { ...user, isFollowing: following } : user,
            ),
          }
        : page,
    ),
  };
}

/** The profile as it looks once `following` is true or false; already in that state, unchanged. */
export function withFollow(profile: UserProfile, following: boolean): UserProfile {
  if (profile.isFollowing === following) return profile;
  return {
    ...profile,
    isFollowing: following,
    followersCount: Math.max(0, profile.followersCount + (following ? 1 : -1)),
  };
}
