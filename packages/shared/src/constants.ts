/** Maximum tweet length, measured in Unicode code points (see `countCharacters`). */
export const TWEET_MAX_LENGTH = 280;

/** Lowercase letters, digits and underscores; stored lowercase (ADR-18). */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,15}$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 15;

export const DISPLAY_NAME_MAX_LENGTH = 50;
export const EMAIL_MAX_LENGTH = 254;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
