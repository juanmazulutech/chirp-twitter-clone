import { z } from 'zod';

import { userSummarySchema } from './users';

/** Returned by follow and unfollow, so the client can reconcile its optimistic update. */
export const followStateSchema = z.object({
  isFollowing: z.boolean(),
  followersCount: z.number().int().nonnegative(),
});
export type FollowState = z.infer<typeof followStateSchema>;

/** A row of a followers or following list: the user, and whether the viewer follows them. */
export const followListUserSchema = userSummarySchema.extend({ isFollowing: z.boolean() });
export type FollowListUser = z.infer<typeof followListUserSchema>;
