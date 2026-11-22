import { z } from 'zod';

import {
  DISPLAY_NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RESERVED_USERNAMES,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from '../constants';
import { countCharacters } from '../text';
import { sessionUserSchema, userSummarySchema } from './users';

/** Trimmed and lowercased before validation, so `" Ana@Chirp.dev "` and `ana@chirp.dev` match. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email('Enter a valid email address')
      .max(EMAIL_MAX_LENGTH, `Use at most ${EMAIL_MAX_LENGTH} characters`),
  );

/** Case-insensitive: input is lowercased, so `Ana` registers as `ana` (ADR-18). */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  // One message per problem, so an error never just repeats the field's hint.
  .min(1, 'Choose a username')
  .min(USERNAME_MIN_LENGTH, `Use at least ${USERNAME_MIN_LENGTH} characters`)
  .max(USERNAME_MAX_LENGTH, `Use at most ${USERNAME_MAX_LENGTH} characters`)
  .regex(USERNAME_PATTERN, 'Use only letters, numbers and underscores')
  .refine((value) => !RESERVED_USERNAMES.includes(value), 'This username is not available');

export const displayNameSchema = z
  .string()
  .trim()
  .refine((value) => countCharacters(value) > 0, 'Enter your name')
  .refine(
    (value) => countCharacters(value) <= DISPLAY_NAME_MAX_LENGTH,
    `Use at most ${DISPLAY_NAME_MAX_LENGTH} characters`,
  );

/** Rules for choosing a password. Never trimmed: spaces are part of the password. */
export const newPasswordSchema = z
  .string()
  .refine((value) => value.length > 0, 'Choose a password')
  .refine(
    (value) => countCharacters(value) >= PASSWORD_MIN_LENGTH,
    `Use at least ${PASSWORD_MIN_LENGTH} characters`,
  )
  .refine(
    (value) => countCharacters(value) <= PASSWORD_MAX_LENGTH,
    `Use at most ${PASSWORD_MAX_LENGTH} characters`,
  );

export const registerBodySchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  password: newPasswordSchema,
});
export type RegisterBody = z.infer<typeof registerBodySchema>;

/**
 * Signing in only requires a non-empty password: complexity rules apply when a password
 * is chosen, so tightening them later never locks out existing accounts. The upper bound
 * keeps hashing cost bounded.
 */
export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(1024, 'Password is too long'),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

export const authResponseSchema = z.object({ user: userSummarySchema });
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const sessionResponseSchema = z.object({ user: sessionUserSchema });
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
