/**
 * Query keys of the profile module; other modules import them from here, never through a
 * barrel. Usernames in keys are lowercase, as the API stores them, so `/Ana` and `/ana`
 * share one cache entry.
 */
export const profileKeys = {
  all: ['profiles'] as const,
  /** A `UserProfile`. Also the prefix of that user's follow lists. */
  detail: (username: string) => ['profiles', username] as const,
  /** An infinite query of `Page<FollowListUser>`, most recent follow first. */
  followList: (username: string, list: FollowList) => ['profiles', username, list] as const,
};

export type FollowList = 'followers' | 'following';
