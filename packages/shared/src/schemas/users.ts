import { z } from 'zod';

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
