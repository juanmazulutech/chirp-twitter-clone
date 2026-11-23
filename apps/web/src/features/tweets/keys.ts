/** Query keys of the tweets module; other modules import them from here, never through a barrel. */
export const tweetKeys = {
  all: ['tweets'] as const,
  /** The home timeline: an infinite query of `Page<Tweet>`, newest first. */
  timeline: ['tweets', 'timeline'] as const,
  /** One user's chirps (lowercase username): an infinite query of `Page<Tweet>`, newest first. */
  byUser: (username: string) => ['tweets', 'user', username] as const,
  /** One chirp, for its own page: a `Tweet`. */
  detail: (tweetId: string) => ['tweets', 'detail', tweetId] as const,
  /** Every cached chirp page, ancestors and replies included (prefix only). */
  details: ['tweets', 'detail'] as const,
  /** The chirps above one, root first: a `TweetAncestors`. */
  ancestors: (tweetId: string) => ['tweets', 'ancestors', tweetId] as const,
  /** Every cached ancestor chain (prefix only). */
  allAncestors: ['tweets', 'ancestors'] as const,
  /** A chirp's direct replies: an infinite query of `Page<Tweet>`, oldest first. */
  replies: (tweetId: string) => ['tweets', 'replies', tweetId] as const,
};

/**
 * Who liked a chirp. A root of its own, not under `tweetKeys.all`: these are lists of people,
 * and every list under `tweetKeys.all` is assumed to hold chirps.
 */
export const likerKeys = {
  all: ['likers'] as const,
  /** An infinite query of `Page<FollowListUser>`, most recent like first. */
  list: (tweetId: string) => ['likers', tweetId] as const,
};
