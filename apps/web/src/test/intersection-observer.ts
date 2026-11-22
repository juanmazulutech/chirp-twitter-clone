import { act } from '@testing-library/react';

const observers = new Set<FakeIntersectionObserver>();

/**
 * jsdom has no layout, so it implements no IntersectionObserver. This stand-in records
 * what is observed and reports an intersection only when a test calls `scrollToEnd`,
 * which keeps each page load an explicit step of the test.
 */
class FakeIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin: string;
  readonly scrollMargin = '0px';
  readonly thresholds = [0];
  private readonly targets = new Set<Element>();

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {},
  ) {
    this.rootMargin = options.rootMargin ?? '0px';
  }

  observe(target: Element) {
    this.targets.add(target);
    observers.add(this);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.targets.clear();
    observers.delete(this);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  intersect() {
    const entries = [...this.targets].map((target) => ({
      target,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRect: target.getBoundingClientRect(),
      rootBounds: null,
      time: performance.now(),
    }));
    if (entries.length > 0) this.callback(entries, this);
  }
}

export function installIntersectionObserver() {
  if (typeof window.IntersectionObserver === 'undefined') {
    window.IntersectionObserver = FakeIntersectionObserver;
  }
}

/** Brings every observed sentinel into view, as scrolling to the end of a list would. */
export function scrollToEnd() {
  act(() => {
    for (const observer of [...observers]) observer.intersect();
  });
}

/** How many elements are being watched, so a test can tell loading has paused. */
export function observedCount(): number {
  return observers.size;
}
