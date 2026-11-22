import { describe, expect, it } from 'vitest';

import { SEARCH_QUERY_MAX_LENGTH } from '../constants';
import { searchTermSchema, userSearchQuerySchema } from './search';

describe('searchTermSchema', () => {
  it.each([
    ['ana', 'ana'],
    ['  Ana Torres ', 'Ana Torres'],
    ['@ana', 'ana'],
    [' @ ana', 'ana'],
  ])('cleans %j into %j', (input, output) => {
    expect(searchTermSchema.parse(input)).toBe(output);
  });

  it.each(['', '   ', '@', ' @ '])('rejects %j, which has nothing left to search', (input) => {
    expect(searchTermSchema.safeParse(input).success).toBe(false);
  });

  it('allows 50 characters and rejects 51', () => {
    expect(searchTermSchema.safeParse('a'.repeat(SEARCH_QUERY_MAX_LENGTH)).success).toBe(true);
    expect(searchTermSchema.safeParse('a'.repeat(SEARCH_QUERY_MAX_LENGTH + 1)).success).toBe(false);
  });
});

describe('userSearchQuerySchema', () => {
  it('adds the term to the usual page query', () => {
    expect(userSearchQuerySchema.parse({ q: '@ana', limit: '5' })).toEqual({ q: 'ana', limit: 5 });
  });
});
