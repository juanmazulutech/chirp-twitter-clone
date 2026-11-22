import { type ErrorCode, errorResponseSchema, type FieldErrors } from '@chirp/shared';

/** The API's error codes, plus the one the client adds when the request never got an answer. */
export type ApiErrorCode = ErrorCode | 'NETWORK_ERROR';

interface ApiErrorInit {
  status: number;
  code: ApiErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
  formErrors?: string[];
}

/** Every failed request becomes one of these, so callers branch on `status` and `code`. */
export class ApiError extends Error {
  /** HTTP status; 0 when the server could not be reached. */
  readonly status: number;
  readonly code: ApiErrorCode;
  /** Messages per form field, e.g. `{ username: ['This username is taken'] }`. */
  readonly fieldErrors: FieldErrors;
  readonly formErrors: string[];

  constructor({ status, code, message, fieldErrors = {}, formErrors = [] }: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.formErrors = formErrors;
  }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}

/** Any Zod schema from `@chirp/shared`; typed structurally so the web app needs no Zod import. */
interface ResponseSchema<T> {
  parse: (data: unknown) => T;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

const API_PREFIX = '/api';

/**
 * Calls the API (same origin, so the session cookie travels with it). A response body is
 * validated with its shared schema: the server's JSON is untrusted input, and a broken
 * contract should fail here rather than deep inside a component.
 */
export function apiRequest<T>(
  path: string,
  options: RequestOptions & { schema: ResponseSchema<T> },
): Promise<T>;
/** A request whose success has no body (204), such as signing out. */
export function apiRequest(path: string, options?: RequestOptions): Promise<void>;
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, signal, schema }: RequestOptions & { schema?: ResponseSchema<T> } = {},
): Promise<T | undefined> {
  let response: Response;
  try {
    response = await fetch(API_PREFIX + path, {
      method,
      signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    // An abort is TanStack Query cancelling a request nobody needs any more, not a failure.
    if (signal?.aborted) throw error;
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Can’t reach Chirp. Check your connection and try again.',
    });
  }

  if (!response.ok) throw await toApiError(response);
  if (!schema) return undefined;

  try {
    return schema.parse(await response.json());
  } catch {
    throw new ApiError({
      status: response.status,
      code: 'INTERNAL_ERROR',
      message: 'Chirp sent a response this page doesn’t understand. Reload and try again.',
    });
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const parsed = errorResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    // Not our API's error shape: a proxy page, a gateway timeout, an empty body.
    return new ApiError({
      status: response.status,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side. Try again in a moment.',
    });
  }
  const { code, message, details } = parsed.data.error;
  return new ApiError({
    status: response.status,
    code,
    message,
    fieldErrors: details?.fieldErrors,
    formErrors: details?.formErrors,
  });
}
