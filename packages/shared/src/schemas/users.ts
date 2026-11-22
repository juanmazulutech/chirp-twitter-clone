import { z } from 'zod';

import { USERNAME_MAX_LENGTH } from '../constants';

/** The public face of a user, embedded in tweets, lists and search results. */
export const userSummarySchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.url().nullable(),
});
export type UserSummary = z.infer<typeof userSummarySchema>;

/** The signed-in user as seen by themselves; includes private fields such as the email. */
export const sessionUserSchema = userSummarySchema.extend({
  email: z.email(),
  bio: z.string(),
  createdAt: z.iso.datetime(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

/**
 * A username in a URL. Deliberately looser than `usernameSchema`: any name that is not
 * taken (reserved names included) should read as "not found", not as invalid input.
 */
export const usernameParamsSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(USERNAME_MAX_LENGTH),
});
export type UsernameParams = z.infer<typeof usernameParamsSchema>;
