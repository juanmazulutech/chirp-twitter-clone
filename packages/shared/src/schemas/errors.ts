import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** Field-level messages keyed by dot-separated path (e.g. `email`, `items.0.name`). */
export const fieldErrorsSchema = z.record(z.string(), z.array(z.string()));
export type FieldErrors = z.infer<typeof fieldErrorsSchema>;

export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z
      .object({
        fieldErrors: fieldErrorsSchema,
        formErrors: z.array(z.string()),
      })
      .optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
