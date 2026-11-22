import { describe, expect, it } from 'vitest';

import { TWEET_MAX_LENGTH } from '../constants';
import { createTweetBodySchema, tweetContentSchema, tweetParamsSchema } from './tweets';

describe('tweetContentSchema', () => {
  it('trims surrounding whitespace', () => {
    expect(tweetContentSchema.parse('  hello chirp \n')).toBe('hello chirp');
  });

  it.each(['', '   ', '\n\t'])('rejects empty content %j', (value) => {
    expect(tweetContentSchema.safeParse(value).success).toBe(false);
  });

  it('accepts exactly the maximum length', () => {
    expect(tweetContentSchema.safeParse('a'.repeat(TWEET_MAX_LENGTH)).success).toBe(true);
  });

  it('rejects one character over the maximum', () => {
    expect(tweetContentSchema.safeParse('a'.repeat(TWEET_MAX_LENGTH + 1)).success).toBe(false);
  });

  it('counts an emoji as one character, like PostgreSQL', () => {
    // 280 emoji are 560 UTF-16 code units but 280 code points.
    expect(tweetContentSchema.safeParse('👍'.repeat(TWEET_MAX_LENGTH)).success).toBe(true);
  });

  it('ignores whitespace that trimming removes when measuring length', () => {
    expect(tweetContentSchema.safeParse(`  ${'a'.repeat(TWEET_MAX_LENGTH)}  `).success).toBe(true);
  });
});

describe('createTweetBodySchema', () => {
  it('requires content', () => {
    expect(createTweetBodySchema.safeParse({}).success).toBe(false);
  });
});

describe('tweetParamsSchema', () => {
  it('rejects an id that is not a UUID', () => {
    expect(tweetParamsSchema.safeParse({ id: '123' }).success).toBe(false);
  });
});
