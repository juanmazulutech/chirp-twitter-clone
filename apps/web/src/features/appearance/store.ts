import { create } from 'zustand';

import { type Appearance, applyAppearance, readAppearance, saveAppearance } from './appearance';

interface AppearanceState {
  appearance: Appearance;
  isDialogOpen: boolean;
  setAppearance: (appearance: Appearance) => void;
  openDialog: () => void;
  closeDialog: () => void;
}

/**
 * The viewer's theme choice and whether its dialog is showing. Client-only UI state
 * (ADR-07): the choice belongs to this device, not to the account. index.html has already
 * applied the saved choice before the first paint, so the store only reads it.
 */
export const useAppearanceStore = create<AppearanceState>()((set) => ({
  appearance: readAppearance(),
  isDialogOpen: false,
  setAppearance: (appearance) => {
    saveAppearance(appearance);
    applyAppearance(appearance);
    set({ appearance });
  },
  openDialog: () => set({ isDialogOpen: true }),
  closeDialog: () => set({ isDialogOpen: false }),
}));
