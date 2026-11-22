/** Query keys of the search module; other modules import them from here, never through a barrel. */
export const searchKeys = {
  all: ['search'] as const,
  /** People matching a cleaned term: an infinite query of `Page<FollowListUser>`. */
  users: (term: string) => ['search', 'users', term] as const,
};
