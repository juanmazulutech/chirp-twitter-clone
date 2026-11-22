import { afterEach, describe, expect, it, vi } from 'vitest';

import { lockPageScroll, scrollbarGutterWidth } from './scroll-lock';

/** jsdom does no layout; give the root the width a browser with a 15px scrollbar would. */
function layOut(root: HTMLElement, clientWidth: number) {
  vi.spyOn(root, 'clientWidth', 'get').mockReturnValue(clientWidth);
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('scrollbarGutterWidth', () => {
  it('measures a classic scrollbar or reserved gutter', () => {
    const root = document.createElement('html');
    layOut(root, 1425);

    expect(scrollbarGutterWidth(root)).toBe(15);
  });

  it('is 0 with overlay scrollbars', () => {
    const root = document.createElement('html');
    layOut(root, 1440);

    expect(scrollbarGutterWidth(root)).toBe(0);
  });

  it('is 0 for an element that has not been laid out', () => {
    expect(scrollbarGutterWidth(document.createElement('html'))).toBe(0);
  });
});

describe('lockPageScroll', () => {
  it('trades the gutter for padding of the same width, so the backdrop covers it', () => {
    const root = document.createElement('html');
    root.style.setProperty('scrollbar-gutter', 'stable');
    layOut(root, 1425);

    const unlock = lockPageScroll(root);

    expect(root.style.overflow).toBe('hidden');
    expect(root.style.paddingRight).toBe('15px');
    expect(root.style.getPropertyValue('scrollbar-gutter')).toBe('auto');

    unlock();

    expect(root.style.overflow).toBe('');
    expect(root.style.paddingRight).toBe('');
    expect(root.style.getPropertyValue('scrollbar-gutter')).toBe('stable');
  });

  it('only stops scrolling when scrollbars overlay the page', () => {
    const root = document.createElement('html');
    layOut(root, 1440);

    const unlock = lockPageScroll(root);

    expect(root.style.overflow).toBe('hidden');
    expect(root.style.paddingRight).toBe('');

    unlock();
    expect(root.style.overflow).toBe('');
  });

  it('restores styles the page already had', () => {
    const root = document.createElement('html');
    root.style.overflow = 'auto';
    root.style.paddingRight = '4px';
    layOut(root, 1425);

    lockPageScroll(root)();

    expect(root.style.overflow).toBe('auto');
    expect(root.style.paddingRight).toBe('4px');
  });
});
