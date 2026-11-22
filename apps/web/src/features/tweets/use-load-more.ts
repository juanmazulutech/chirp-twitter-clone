import { useCallback, useEffect, useRef } from 'react';

/** Starts the next page well before the reader reaches the end, so scrolling rarely waits. */
const LOOKAHEAD = '0px 0px 600px 0px';

/**
 * Returns a ref for a sentinel element placed after a list: `loadMore` runs when the
 * sentinel comes within reach of the viewport. Pass `enabled: false` while a page is
 * loading or has failed; when it turns back on, a fresh observer reports the sentinel's
 * current position, so a page too short to fill the screen still leads to the next one.
 */
export function useLoadMore(loadMore: () => void, enabled: boolean) {
  // The latest callback, without re-creating the observer every render.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  return useCallback(
    (sentinel: HTMLElement | null) => {
      if (!sentinel || !enabled) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current();
        },
        { rootMargin: LOOKAHEAD },
      );
      observer.observe(sentinel);
      return () => {
        observer.disconnect();
      };
    },
    [enabled],
  );
}
