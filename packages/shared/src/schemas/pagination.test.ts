import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from '../constants';
import { pageQuerySchema, pageSchema } from './pagination';

describe('pageQuerySchema', () => {
  it('defaults the limit and leaves the cursor out', () => {
    expect(pageQuerySchema.parse({})).toEqual({ limit: PAGE_SIZE_DEFAULT });
  });

  it('coerces the limit from the query string', () => {
    expect(pageQuerySchema.parse({ limit: '5', cursor: 'abc' })).toEqual({
      limit: 5,
      cursor: 'abc',
    });
  });

  it('accepts the maximum page size', () => {
    expect(pageQuerySchema.safeParse({ limit: String(PAGE_SIZE_MAX) }).success).toBe(true);
  });

  it.each(['0', String(PAGE_SIZE_MAX + 1), '2.5', 'ten'])('rejects a limit of %j', (limit) => {
    expect(pageQuerySchema.safeParse({ limit }).success).toBe(false);
  });

  it.each(['', 'a'.repeat(201)])('rejects a cursor of length %#', (cursor) => {
    expect(pageQuerySchema.safeParse({ cursor }).success).toBe(false);
  });
});

describe('pageSchema', () => {
  const numbers = pageSchema(z.number());

  it('accepts a page and a last page', () => {
    expect(numbers.safeParse({ items: [1, 2], nextCursor: 'next' }).success).toBe(true);
    expect(numbers.safeParse({ items: [], nextCursor: null }).success).toBe(true);
  });

  it('validates every item', () => {
    expect(numbers.safeParse({ items: ['1'], nextCursor: null }).success).toBe(false);
  });
});
