import { afterEach, describe, expect, it, vi } from 'vitest';

import indexHtml from '../../../index.html?raw';
import {
  APPEARANCE_STORAGE_KEY,
  applyAppearance,
  readAppearance,
  saveAppearance,
} from './appearance';

const root = document.documentElement;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readAppearance', () => {
  it('follows the system when nothing is saved', () => {
    expect(readAppearance()).toBe('system');
  });

  it('returns a saved choice', () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'dark');

    expect(readAppearance()).toBe('dark');
  });

  it('treats an unknown saved value as the system choice', () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'sepia');

    expect(readAppearance()).toBe('system');
  });

  it('falls back to the system choice when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    expect(readAppearance()).toBe('system');
  });
});

describe('saveAppearance', () => {
  it('stores a light or dark choice and forgets the system one', () => {
    saveAppearance('light');
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe('light');

    saveAppearance('system');
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBeNull();
  });

  it('does not throw when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });

    expect(() => saveAppearance('dark')).not.toThrow();
  });
});

describe('applyAppearance', () => {
  it('pins the colour scheme, and clears it for the system choice', () => {
    applyAppearance('dark');
    expect(root.style.colorScheme).toBe('dark');

    applyAppearance('system');
    expect(root.style.colorScheme).toBe('');
  });
});

describe('the pre-paint script in index.html', () => {
  function runPrePaintScript() {
    const source = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)?.[1];
    if (!source) throw new Error('index.html has no inline script');
    const script = document.createElement('script');
    script.textContent = source;
    document.head.append(script);
    script.remove();
  }

  it('reads the same storage key as the app', () => {
    expect(indexHtml).toContain(`'${APPEARANCE_STORAGE_KEY}'`);
  });

  it('applies a saved choice before the app loads', () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'light');

    runPrePaintScript();

    expect(root.style.colorScheme).toBe('light');
  });

  it('ignores a value the app would not accept', () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'red; background: red');

    runPrePaintScript();

    expect(root.style.colorScheme).toBe('');
  });
});
