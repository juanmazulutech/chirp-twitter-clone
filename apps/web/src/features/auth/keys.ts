/** Query keys of the auth module; other modules import them from here, never through a barrel. */
export const authKeys = {
  /** The signed-in user, or `null` when there is no session (ARCHITECTURE §6.3). */
  session: ['auth', 'me'] as const,
};
