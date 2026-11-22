/**
 * Query keys of the profile module; other modules import them from here, never through a
 * barrel. Usernames in keys are lowercase, as the API stores them, so `/Ana` and `/ana`
 * share one cache entry.
 */
export const profileKeys = {
  all: ['profiles'] as const,
  /** A `UserProfile`. */
  detail: (username: string) => ['profiles', username] as const,
};
