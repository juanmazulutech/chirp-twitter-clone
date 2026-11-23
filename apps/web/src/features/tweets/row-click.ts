/** What a click lands on that already does something of its own inside a chirp row. */
const INTERACTIVE = 'a, button, input, textarea, select, label, dialog, [role="dialog"]';

/**
 * Whether a click on a chirp row should open the chirp's conversation: a plain primary click
 * on the row itself, not on one of its links or buttons (or a dialog they opened, which sits
 * inside the row in the DOM), and not the end of selecting text to copy.
 */
export function opensFromRowClick(
  event: Pick<MouseEvent, 'button' | 'defaultPrevented' | 'target'>,
  selection: string = window.getSelection()?.toString() ?? '',
): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return false;
  return selection.length === 0;
}
