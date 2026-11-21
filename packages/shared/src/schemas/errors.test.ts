import { describe, expect, it } from 'vitest';

import { errorResponseSchema } from './errors';

describe('errorResponseSchema', () => {
  it('accepts an error without details', () => {
    const body = { error: { code: 'NOT_FOUND', message: 'Tweet not found' } };
    expect(errorResponseSchema.parse(body)).toEqual(body);
  });

  it('accepts a validation error with field and form errors', () => {
    const body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: { fieldErrors: { email: ['Invalid email'] }, formErrors: [] },
      },
    };
    expect(errorResponseSchema.parse(body)).toEqual(body);
  });

  it('rejects an unknown error code', () => {
    const result = errorResponseSchema.safeParse({ error: { code: 'TEAPOT', message: 'nope' } });
    expect(result.success).toBe(false);
  });

  it('rejects a body without the error envelope', () => {
    expect(errorResponseSchema.safeParse({ code: 'NOT_FOUND', message: 'x' }).success).toBe(false);
  });
});
