import { z } from 'zod';

/** Returned by like and unlike, so the client can reconcile its optimistic update. */
export const likeStateSchema = z.object({
  liked: z.boolean(),
  likeCount: z.number().int().nonnegative(),
});
export type LikeState = z.infer<typeof likeStateSchema>;
