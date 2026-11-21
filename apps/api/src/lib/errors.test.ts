import { describe, expect, it } from 'vitest';

import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from './errors';

describe('domain errors', () => {
  it.each([
    [new ValidationError(), 400, 'VALIDATION_ERROR', 'Invalid request'],
    [new UnauthenticatedError(), 401, 'UNAUTHENTICATED', 'Authentication required'],
    [new ForbiddenError(), 403, 'FORBIDDEN', 'You are not allowed to perform this action'],
    [new NotFoundError('Tweet'), 404, 'NOT_FOUND', 'Tweet not found'],
    [new ConflictError(), 409, 'CONFLICT', 'Resource already exists'],
  ])('%s maps to %i %s', (error, statusCode, code, message) => {
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ statusCode, code, message });
  });

  it('names each error after its class', () => {
    expect(new NotFoundError().name).toBe('NotFoundError');
    expect(new NotFoundError().message).toBe('Resource not found');
  });

  it('carries field errors and the original cause', () => {
    const cause = new Error('unique constraint violated');
    const error = new ConflictError('Email is already registered', {
      fieldErrors: { email: ['Email is already registered'] },
      cause,
    });

    expect(error.fieldErrors).toEqual({ email: ['Email is already registered'] });
    expect(error.cause).toBe(cause);
  });
});
