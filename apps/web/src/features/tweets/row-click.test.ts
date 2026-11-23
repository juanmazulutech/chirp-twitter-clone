import { describe, expect, it } from 'vitest';

import { opensFromRowClick } from './row-click';

function clickOn(
  target: Element,
  overrides: Partial<Pick<MouseEvent, 'button' | 'defaultPrevented'>> = {},
) {
  return { button: 0, defaultPrevented: false, target, ...overrides };
}

describe('opensFromRowClick', () => {
  const row = document.createElement('article');
  row.innerHTML = `
    <p>Some <strong>chirp</strong> text</p>
    <a href="/ana"><span>Ana</span></a>
    <button type="button"><svg></svg></button>
    <dialog><p>Delete chirp?</p></dialog>
  `;
  const find = (selector: string) => {
    const element = row.querySelector(selector);
    if (!element) throw new Error(`missing ${selector}`);
    return element;
  };

  it('opens on a plain click on the row’s text', () => {
    expect(opensFromRowClick(clickOn(find('strong')), '')).toBe(true);
  });

  it.each([
    ['a link', 'a span'],
    ['a button', 'button svg'],
    ['a dialog the row opened', 'dialog p'],
  ])('leaves a click on %s to it', (_case, selector) => {
    expect(opensFromRowClick(clickOn(find(selector)), '')).toBe(false);
  });

  it('does not open when text was being selected', () => {
    expect(opensFromRowClick(clickOn(find('p')), 'chirp')).toBe(false);
  });

  it('ignores other buttons and handled clicks', () => {
    expect(opensFromRowClick(clickOn(find('p'), { button: 1 }), '')).toBe(false);
    expect(opensFromRowClick(clickOn(find('p'), { defaultPrevented: true }), '')).toBe(false);
  });
});
