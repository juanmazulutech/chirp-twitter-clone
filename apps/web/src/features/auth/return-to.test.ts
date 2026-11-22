import { describe, expect, it } from 'vitest';

import { returnToPath, returnToState } from './return-to';

describe('returnToState', () => {
  it('keeps the path, query and fragment of the page', () => {
    expect(returnToState({ pathname: '/search', search: '?q=ana', hash: '#top' })).toEqual({
      from: '/search?q=ana#top',
    });
  });
});

describe('returnToPath', () => {
  it.each([
    '/home',
    '/ana_codes/followers',
    '/search?q=ana',
    '/loginname',
    '/registered/followers',
  ])('returns to %s', (from) => {
    expect(returnToPath({ from })).toBe(from);
  });

  it.each([
    ['no state', null],
    ['a state without a page', { other: true }],
    ['a page that is not text', { from: 42 }],
    ['a full address', { from: 'https://evil.example/home' }],
    ['a protocol-relative address', { from: '//evil.example' }],
    ['a backslash address', { from: '/\\evil.example' }],
    ['a relative path', { from: 'home' }],
    ['the sign-in screen', { from: '/login' }],
    ['the sign-in screen with a query', { from: '/login?next=1' }],
    ['account creation', { from: '/register' }],
  ])('ignores %s', (_case, state) => {
    expect(returnToPath(state)).toBeNull();
  });
});
