/** Query keys of the tweets module; other modules import them from here, never through a barrel. */
export const tweetKeys = {
  all: ['tweets'] as const,
  /** The home timeline: an infinite query of `Page<Tweet>`, newest first. */
  timeline: ['tweets', 'timeline'] as const,
  /** One user's chirps (lowercase username): an infinite query of `Page<Tweet>`, newest first. */
  byUser: (username: string) => ['tweets', 'user', username] as const,
};
