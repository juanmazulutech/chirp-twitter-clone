import { describe, expect, it, vi } from 'vitest';

import { ApiError } from './api-client';
import { applyServerError } from './form-errors';

interface Values {
  email: string;
  username: string;
}

const fields = ['email', 'username'] as const;

describe('applyServerError', () => {
  it('puts field messages on their fields, focusing only the first', () => {
    const setError = vi.fn();
    const error = new ApiError({
      status: 409,
      code: 'CONFLICT',
      message: 'Conflict',
      fieldErrors: { username: ['Taken'], email: ['Registered'] },
    });

    const message = applyServerError<Values>(error, setError, { fields });

    expect(message).toBeNull();
    expect(setError).toHaveBeenNthCalledWith(
      1,
      'email',
      { type: 'server', message: 'Registered' },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenNthCalledWith(
      2,
      'username',
      { type: 'server', message: 'Taken' },
      { shouldFocus: false },
    );
  });

  it('ignores field errors for fields the form does not have', () => {
    const setError = vi.fn();
    const error = new ApiError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
      fieldErrors: { avatarKey: ['Unknown upload'] },
    });

    expect(applyServerError<Values>(error, setError, { fields })).toBe('Invalid request');
    expect(setError).not.toHaveBeenCalled();
  });

  it('returns form-level errors from the API', () => {
    const error = new ApiError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
      formErrors: ['Fill in at least one field.'],
    });

    expect(applyServerError<Values>(error, vi.fn(), { fields })).toBe(
      'Fill in at least one field.',
    );
  });

  it('uses the form’s own message for a 401, and the API’s when it has none', () => {
    const error = new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'Sign in' });

    expect(applyServerError<Values>(error, vi.fn(), { fields, unauthenticated: 'No match' })).toBe(
      'No match',
    );
    expect(applyServerError<Values>(error, vi.fn(), { fields })).toBe('Sign in');
  });

  it('asks to wait on a 429', () => {
    const error = new ApiError({ status: 429, code: 'RATE_LIMITED', message: 'Slow down' });

    expect(applyServerError<Values>(error, vi.fn(), { fields })).toMatch(/wait a minute/i);
  });

  it('falls back to a generic message for anything that is not an API error', () => {
    expect(applyServerError<Values>(new Error('boom'), vi.fn(), { fields })).toMatch(
      /something went wrong/i,
    );
  });
});
