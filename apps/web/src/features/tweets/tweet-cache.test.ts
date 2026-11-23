import type { Tweet } from '@chirp/shared';
import { describe, expect, it } from 'vitest';

import { tweetFixture } from '@/test/fixtures';

import { isTweetAncestors, updateTweetInCache } from './tweet-cache';

const like = (tweet: Tweet): Tweet => ({ ...tweet, likedByMe: true });

describe('updateTweetInCache', () => {
  const target = tweetFixture();
  const other = tweetFixture();

  it('updates the chirp in a list of pages and keeps other pages as they were', () => {
    const untouched = { items: [other], nextCursor: null };
    const data = { pages: [{ items: [target], nextCursor: 'next' }, untouched], pageParams: [] };

    const updated = updateTweetInCache(data, target.id, like) as typeof data;

    expect(updated.pages[0]?.items[0]?.likedByMe).toBe(true);
    expect(updated.pages[1]).toBe(untouched);
  });

  it('updates the chirp in an ancestor chain', () => {
    const updated = updateTweetInCache({ items: [other, target] }, target.id, like);

    expect(updated).toEqual({ items: [other, { ...target, likedByMe: true }] });
  });

  it('returns an ancestor chain without the chirp unchanged', () => {
    const data = { items: [other] };

    expect(updateTweetInCache(data, target.id, like)).toBe(data);
  });

  it('updates a single cached chirp only when it is that chirp', () => {
    expect(updateTweetInCache(target, target.id, like)).toEqual({ ...target, likedByMe: true });
    expect(updateTweetInCache(other, target.id, like)).toBe(other);
  });

  it('leaves anything else alone', () => {
    const profile = { username: 'ana' };

    expect(updateTweetInCache(profile, target.id, like)).toBe(profile);
    expect(updateTweetInCache(undefined, target.id, like)).toBeUndefined();
  });
});

describe('isTweetAncestors', () => {
  it('tells an ancestor chain from a page of a list', () => {
    expect(isTweetAncestors({ items: [] })).toBe(true);
    expect(isTweetAncestors({ items: [], nextCursor: null })).toBe(false);
  });
});
