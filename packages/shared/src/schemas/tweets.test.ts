import { describe, expect, it } from 'vitest';

import { TWEET_MAX_LENGTH } from '../constants';
import {
  createTweetBodySchema,
  tweetContentSchema,
  tweetParamsSchema,
  tweetSchema,
} from './tweets';

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

describe('tweetSchema', () => {
  const author = {
    id: '019a0000-0000-7000-8000-000000000001',
    username: 'ana',
    displayName: 'Ana',
    avatarUrl: null,
  };
  const tweet = {
    id: '019a0000-0000-7000-8000-000000000002',
    content: 'hello',
    imageUrl: null,
    createdAt: '2026-11-22T10:00:00.000Z',
    author,
    likeCount: 0,
    likedByMe: false,
    replyCount: 0,
    replyTo: null,
  };

  it('accepts a top-level chirp', () => {
    expect(tweetSchema.safeParse(tweet).success).toBe(true);
  });

  it('accepts a reply with the chirp it answers', () => {
    const reply = { ...tweet, replyTo: { id: '019a0000-0000-7000-8000-000000000003', author } };
    expect(tweetSchema.safeParse(reply).success).toBe(true);
  });

  it('requires the reply fields', () => {
    const { replyCount: _count, replyTo: _to, ...withoutReplies } = tweet;
    expect(tweetSchema.safeParse(withoutReplies).success).toBe(false);
  });

  it('rejects a negative reply count', () => {
    expect(tweetSchema.safeParse({ ...tweet, replyCount: -1 }).success).toBe(false);
  });
});
