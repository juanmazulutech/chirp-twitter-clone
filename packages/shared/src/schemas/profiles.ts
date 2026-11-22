import { z } from 'zod';

import { BIO_MAX_LENGTH } from '../constants';
import { countCharacters } from '../text';
import { displayNameSchema } from './auth';
import { imageKeySchema } from './tweets';
import { userSummarySchema } from './users';

/** Trimmed; empty is allowed (no bio). */
export const bioSchema = z
  .string()
  .trim()
  .refine(
    (value) => countCharacters(value) <= BIO_MAX_LENGTH,
    `Use at most ${BIO_MAX_LENGTH} characters`,
  );

/** A public profile with its counts, as seen by the viewer. */
export const userProfileSchema = userSummarySchema.extend({
  bio: z.string(),
  createdAt: z.iso.datetime(),
  followersCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  tweetsCount: z.number().int().nonnegative(),
  /** Whether the viewer follows this user; always false on the viewer's own profile. */
  isFollowing: z.boolean(),
  isMe: z.boolean(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

/**
 * Only the fields sent change. `avatarKey` is the key `POST /uploads/presign` returned for an
 * avatar; `null` removes the picture.
 */
export const updateProfileBodySchema = z.object({
  displayName: displayNameSchema.optional(),
  bio: bioSchema.optional(),
  avatarKey: imageKeySchema.nullable().optional(),
});
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
