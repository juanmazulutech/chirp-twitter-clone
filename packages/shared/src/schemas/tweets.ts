import { z } from 'zod';

import { TWEET_MAX_LENGTH } from '../constants';
import { countCharacters } from '../text';
import { userSummarySchema } from './users';

/** Trimmed first, so surrounding whitespace neither counts nor makes an empty chirp valid. */
export const tweetContentSchema = z
  .string()
  .trim()
  .refine((value) => countCharacters(value) > 0, 'Write something first')
  .refine(
    (value) => countCharacters(value) <= TWEET_MAX_LENGTH,
    `Use at most ${TWEET_MAX_LENGTH} characters`,
  );

/**
 * The key `POST /uploads/presign` returned for a chirp image (ADR-14). Only its shape is
 * checked here; the API checks it belongs to the author and the upload arrived.
 */
export const imageKeySchema = z.string().min(1).max(255);

export const createTweetBodySchema = z.object({
  content: tweetContentSchema,
  imageKey: imageKeySchema.optional(),
});
export type CreateTweetBody = z.infer<typeof createTweetBodySchema>;

export const tweetParamsSchema = z.object({ id: z.uuid() });
export type TweetParams = z.infer<typeof tweetParamsSchema>;

export const tweetSchema = z.object({
  id: z.uuid(),
  content: z.string(),
  imageUrl: z.url().nullable(),
  createdAt: z.iso.datetime(),
  author: userSummarySchema,
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
});
export type Tweet = z.infer<typeof tweetSchema>;
