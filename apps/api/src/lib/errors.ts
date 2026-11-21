import type { ErrorCode, FieldErrors } from '@chirp/shared';

interface DomainErrorOptions {
  fieldErrors?: FieldErrors;
  cause?: unknown;
}

/**
 * Base class for errors raised by services. Services describe *what* went wrong;
 * the errors plugin translates it into an HTTP response, so services never
 * depend on Fastify.
 */
export class DomainError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly fieldErrors: FieldErrors | undefined;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    options: DomainErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = options.fieldErrors;
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'Invalid request', options?: DomainErrorOptions) {
    super(400, 'VALIDATION_ERROR', message, options);
  }
}

export class UnauthenticatedError extends DomainError {
  constructor(message = 'Authentication required', options?: DomainErrorOptions) {
    super(401, 'UNAUTHENTICATED', message, options);
  }
}

export class ForbiddenError extends DomainError {
  constructor(
    message = 'You are not allowed to perform this action',
    options?: DomainErrorOptions,
  ) {
    super(403, 'FORBIDDEN', message, options);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource = 'Resource', options?: DomainErrorOptions) {
    super(404, 'NOT_FOUND', `${resource} not found`, options);
  }
}

export class ConflictError extends DomainError {
  constructor(message = 'Resource already exists', options?: DomainErrorOptions) {
    super(409, 'CONFLICT', message, options);
  }
}
