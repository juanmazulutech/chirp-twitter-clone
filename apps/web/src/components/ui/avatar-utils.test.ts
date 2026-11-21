import { describe, expect, it } from 'vitest';

import { avatarColorOf, initialsOf } from './avatar-utils';

describe('initialsOf', () => {
  it.each([
    ['Ana Torres', 'AT'],
    ['kenji', 'K'],
    ['Lucía Fernández García', 'LF'],
    ['  spaced   name ', 'SN'],
    ['élodie', 'É'],
    ['🐦 Bird', '🐦B'],
    ['', '?'],
    ['   ', '?'],
  ])('%j → %j', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });
});

describe('avatarColorOf', () => {
  it('is stable for the same user', () => {
    expect(avatarColorOf('user-1')).toBe(avatarColorOf('user-1'));
  });

  it('spreads users over the palette', () => {
    const colors = new Set(Array.from({ length: 60 }, (_, i) => avatarColorOf(`user-${i}`)));
    expect(colors.size).toBe(6);
  });
});
