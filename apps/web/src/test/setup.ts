import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { useComposerStore } from '@/features/tweets/store';

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

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
  cleanup();
  // Zustand stores are module singletons; each test starts from the initial UI state.
  useComposerStore.setState(useComposerStore.getInitialState());
  server.resetHandlers();
});

afterAll(() => server.close());
