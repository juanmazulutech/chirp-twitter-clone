import { z } from 'zod';

/** Returned by follow and unfollow, so the client can reconcile its optimistic update. */
export const followStateSchema = z.object({
  isFollowing: z.boolean(),
  followersCount: z.number().int().nonnegative(),
});
export type FollowState = z.infer<typeof followStateSchema>;
