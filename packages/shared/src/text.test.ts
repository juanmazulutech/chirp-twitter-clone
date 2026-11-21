import { describe, expect, it } from 'vitest';

import { TWEET_MAX_LENGTH } from './constants';
import { countCharacters } from './text';

describe('countCharacters', () => {
  it('returns 0 for an empty string', () => {
    expect(countCharacters('')).toBe(0);
  });

  it('counts plain ASCII text by length', () => {
    expect(countCharacters('hello chirp')).toBe(11);
  });

  it('counts accented characters once', () => {
    expect(countCharacters('canción')).toBe(7);
  });

  it('counts an astral-plane emoji as one character', () => {
    expect('👍'.length).toBe(2);
    expect(countCharacters('👍')).toBe(1);
  });

  it('counts each code point of a ZWJ sequence', () => {
    // 👨‍👩‍👧 = man + ZWJ + woman + ZWJ + girl
    expect(countCharacters('👨‍👩‍👧')).toBe(5);
  });

  it('counts a flag as its two regional indicator code points', () => {
    expect(countCharacters('🇨🇴')).toBe(2);
  });

  it('allows a tweet of exactly the maximum length made of emoji', () => {
    const text = '🐦'.repeat(TWEET_MAX_LENGTH);
    expect(text.length).toBe(TWEET_MAX_LENGTH * 2);
    expect(countCharacters(text)).toBe(TWEET_MAX_LENGTH);
  });
});
