import { z } from 'zod';

/**
 * Where the choice is kept, per device. Versioned so a future shape can ignore old values.
 * index.html reads the same key before the first paint; keep the two in step.
 */
export const APPEARANCE_STORAGE_KEY = 'chirp.appearance.v1';

export const appearanceSchema = z.enum(['system', 'light', 'dark']);
export type Appearance = z.infer<typeof appearanceSchema>;

/** The saved choice, or `system` when there is none or storage holds something else. */
export function readAppearance(): Appearance {
  try {
    const parsed = appearanceSchema.safeParse(localStorage.getItem(APPEARANCE_STORAGE_KEY));
    return parsed.success ? parsed.data : 'system';
  } catch {
    // Storage can throw (blocked cookies, some private modes); the system theme still works.
    return 'system';
  }
}

export function saveAppearance(appearance: Appearance): void {
  try {
    if (appearance === 'system') localStorage.removeItem(APPEARANCE_STORAGE_KEY);
    else localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance);
  } catch {
    // Not persisted, but still applied for this visit.
  }
}

/**
 * Every colour token is a `light-dark()` pair, so pinning `color-scheme` on the root is the
 * whole theme switch. Clearing it falls back to the stylesheet's `light dark`, the system's.
 */
export function applyAppearance(appearance: Appearance, root = document.documentElement): void {
  root.style.colorScheme = appearance === 'system' ? '' : appearance;
}
