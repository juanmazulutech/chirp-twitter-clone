import type { ErrorCode, ErrorResponse, FieldErrors } from '@chirp/shared';
import { HttpResponse } from 'msw';

/** An error response in the API's format (ARCHITECTURE §3.3). */
export function apiError(
  status: number,
  code: ErrorCode,
  message: string,
  fieldErrors?: FieldErrors,
) {
  return HttpResponse.json<ErrorResponse>(
    {
      error: {
        code,
        message,
        ...(fieldErrors ? { details: { fieldErrors, formErrors: [] } } : {}),
      },
    },
    { status },
  );
}
