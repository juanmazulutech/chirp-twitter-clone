/** Maximum tweet length, measured in Unicode code points (see `countCharacters`). */
export const TWEET_MAX_LENGTH = 280;

/** Lowercase letters, digits and underscores; stored lowercase (ADR-18). */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,15}$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 15;

/**
 * Usernames that would collide with a top-level web path: profiles live at `/:username`,
 * and static routes (and the `/api` and `/assets` prefixes) always win over that segment,
 * so a user with one of these names would have an unreachable profile.
 */
export const RESERVED_USERNAMES: readonly string[] = [
  'api',
  'assets',
  'home',
  'login',
  'logout',
  'notifications',
  'register',
  'search',
  'settings',
  'styleguide',
];

export const DISPLAY_NAME_MAX_LENGTH = 50;
export const EMAIL_MAX_LENGTH = 254;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** Page sizes for every cursor-paginated list (ADR-11). */
export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 50;
