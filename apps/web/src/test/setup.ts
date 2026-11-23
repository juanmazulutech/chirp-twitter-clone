import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { useAppearanceStore } from '@/features/appearance/store';
import { useComposerStore } from '@/features/tweets/store';

import { installIntersectionObserver } from './intersection-observer';
import { server } from './msw/server';

// jsdom does not implement <dialog> methods; real browsers do (verified in captures).
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

installIntersectionObserver();

// jsdom has no layout, so it does not implement scrolling; the shell's ScrollRestoration
// calls it on every navigation. Nothing scrolls in a test, so there is nothing to do.
window.scrollTo = () => {};

// jsdom has no object URLs; previews only need a stable, unique string per file.
if (typeof URL.createObjectURL !== 'function') {
  let objectUrls = 0;
  URL.createObjectURL = () => {
    objectUrls += 1;
    return `blob:test/${objectUrls}`;
  };
  URL.revokeObjectURL = () => {};
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
  cleanup();
  // Zustand stores are module singletons; each test starts from the initial UI state.
  useComposerStore.setState(useComposerStore.getInitialState());
  useAppearanceStore.setState(useAppearanceStore.getInitialState());
  // The theme choice lives in storage and on <html>, both shared by every test in a file.
  localStorage.clear();
  document.documentElement.style.colorScheme = '';
  // Sonner keeps its toasts in a module-level store that outlives the unmounted Toaster;
  // without this, one test's toast reappears in the next.
  toast.dismiss();
  server.resetHandlers();
});

afterAll(() => server.close());
