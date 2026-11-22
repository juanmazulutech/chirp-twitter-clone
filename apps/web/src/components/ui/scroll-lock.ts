/**
 * Stops the page behind a modal from scrolling, and returns the function that undoes it.
 *
 * The root normally reserves its scrollbar gutter (`scrollbar-gutter: stable`) so pages
 * never shift sideways. A modal's backdrop covers only the viewport, which excludes that
 * gutter, so with classic (non-overlay) scrollbars an undimmed strip would remain at the
 * edge. While locked, the gutter is released and replaced by padding of the same width:
 * the backdrop covers everything and the content stays exactly where it was. Overlay
 * scrollbars (phones) reserve no gutter, so nothing is compensated there.
 */
export function lockPageScroll(root: HTMLElement = document.documentElement): () => void {
  const { style } = root;
  const previous = {
    overflow: style.overflow,
    scrollbarGutter: style.getPropertyValue('scrollbar-gutter'),
    paddingRight: style.paddingRight,
  };
  const gutter = scrollbarGutterWidth(root);

  style.overflow = 'hidden';
  if (gutter > 0) {
    style.setProperty('scrollbar-gutter', 'auto');
    style.paddingRight = `${gutter}px`;
  }

  return () => {
    style.overflow = previous.overflow;
    style.setProperty('scrollbar-gutter', previous.scrollbarGutter);
    style.paddingRight = previous.paddingRight;
  };
}

/** Width the root's scrollbar or reserved gutter takes from the viewport; 0 for overlay scrollbars. */
export function scrollbarGutterWidth(root: HTMLElement): number {
  // An element that has not been laid out reports 0; it has no gutter to measure.
  if (root.clientWidth === 0) return 0;
  return Math.max(0, window.innerWidth - root.clientWidth);
}
