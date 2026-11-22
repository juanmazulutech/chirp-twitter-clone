import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll } from 'vitest';

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

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
  cleanup();
  // Zustand stores are module singletons; each test starts from the initial UI state.
  useComposerStore.setState(useComposerStore.getInitialState());
  // Sonner keeps its toasts in a module-level store that outlives the unmounted Toaster;
  // without this, one test's toast reappears in the next.
  toast.dismiss();
  server.resetHandlers();
});

afterAll(() => server.close());
