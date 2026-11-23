import { create } from 'zustand';

interface ComposerState {
  isOpen: boolean;
  /**
   * The chirp being answered, by id only: the chirp itself is server data and stays in the
   * query cache (ADR-07). Null for a new top-level chirp.
   */
  replyToId: string | null;
  open: () => void;
  openReply: (tweetId: string) => void;
  close: () => void;
}

/**
 * Whether the compose modal is showing, and what it answers. Client-only UI state (ADR-07):
 * any compose or reply button in the shell opens the same modal, wherever it sits in the tree.
 */
export const useComposerStore = create<ComposerState>()((set) => ({
  isOpen: false,
  replyToId: null,
  open: () => set({ isOpen: true, replyToId: null }),
  openReply: (tweetId) => set({ isOpen: true, replyToId: tweetId }),
  // The target stays, so a reply drafted and closed by accident is still there on reopening.
  close: () => set({ isOpen: false }),
}));
