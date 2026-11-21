import { create } from 'zustand';

interface ComposerState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/**
 * Whether the compose modal is showing. Client-only UI state (ADR-07): any compose button
 * in the shell opens the same modal, wherever it sits in the tree.
 */
export const useComposerStore = create<ComposerState>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
