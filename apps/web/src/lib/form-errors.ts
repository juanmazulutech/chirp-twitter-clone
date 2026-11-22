import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { isApiError } from './api-client';

interface ApplyServerErrorOptions<T extends FieldValues> {
  /** The form's field names: only these receive field-level messages. */
  fields: readonly Path<T>[];
  /** What a 401 means for this form (e.g. wrong credentials on sign-in). */
  unauthenticated?: string;
}

const TOO_MANY_ATTEMPTS = 'Too many attempts. Wait a minute and try again.';
const UNKNOWN_FAILURE = 'Something went wrong. Try again in a moment.';

/**
 * Puts a failed submission's messages where they belong: per-field messages on their
 * fields (focusing the first), everything else in one message for the whole form.
 * Returns that form-level message, or `null` when the fields already say it all.
 */
export function applyServerError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  { fields, unauthenticated }: ApplyServerErrorOptions<T>,
): string | null {
  if (!isApiError(error)) return UNKNOWN_FAILURE;
  if (error.status === 401 && unauthenticated) return unauthenticated;
  if (error.status === 429) return TOO_MANY_ATTEMPTS;

  const fieldsWithErrors = fields.filter((field) => error.fieldErrors[field]?.length);
  fieldsWithErrors.forEach((field, index) => {
    const [message] = error.fieldErrors[field] ?? [];
    setError(field, { type: 'server', message }, { shouldFocus: index === 0 });
  });

  if (error.formErrors.length > 0) return error.formErrors.join(' ');
  return fieldsWithErrors.length > 0 ? null : error.message;
}
