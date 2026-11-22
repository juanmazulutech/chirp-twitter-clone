import { z } from 'zod';

import { IMAGE_CONTENT_TYPES, IMAGE_MAX_BYTES } from '../constants';

/** What an image is for; it decides where its key lives (`users/{id}/{purpose}/…`). */
export const uploadPurposeSchema = z.enum(['tweet', 'avatar']);
export type UploadPurpose = z.infer<typeof uploadPurposeSchema>;

export const imageContentTypeSchema = z.enum(IMAGE_CONTENT_TYPES, {
  error: 'Use a JPEG, PNG, WebP or GIF image',
});
export type ImageContentType = z.infer<typeof imageContentTypeSchema>;

export const presignUploadBodySchema = z.object({
  purpose: uploadPurposeSchema,
  contentType: imageContentTypeSchema,
  size: z
    .number()
    .int()
    .positive('The image is empty')
    .max(IMAGE_MAX_BYTES, `Use an image of at most ${IMAGE_MAX_BYTES / (1024 * 1024)} MB`),
});
export type PresignUploadBody = z.infer<typeof presignUploadBodySchema>;

/** `uploadUrl` accepts one `PUT` with the declared type and size; `key` goes into the tweet or profile. */
export const presignUploadResponseSchema = z.object({
  uploadUrl: z.url(),
  key: z.string().min(1),
});
export type PresignUploadResponse = z.infer<typeof presignUploadResponseSchema>;
