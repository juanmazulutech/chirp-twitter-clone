// Illustrated avatars for the seed personas (ADR-16): DiceBear's "Notionists" style by Zoish,
// licensed CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/). The SVGs are generated
// by `npm run avatars:generate -w @chirp/api` and committed, so the seed needs no generator.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAvatar } from '@dicebear/core';
import * as notionists from '@dicebear/notionists';

/** Where the generated SVGs live, one per persona: `<username>.svg`. */
export const SEED_AVATAR_DIR = fileURLToPath(new URL('../seed-assets/avatars', import.meta.url));

/** Soft backgrounds: the drawings are ink lines, so each needs a light, distinct ground. */
const BACKGROUNDS = ['c0aede', 'd1d4f9', 'b6e3f4', 'ffd5dc', 'ffdfbf', 'c1f0c1'];

/** The avatar of `username`: the username seeds the drawing, so it never changes between runs. */
export function renderSeedAvatar(username: string): string {
  return createAvatar(notionists, { seed: username, backgroundColor: BACKGROUNDS }).toString();
}

export function seedAvatarPath(username: string): string {
  return join(SEED_AVATAR_DIR, `${username}.svg`);
}

/** The committed SVG of `username`. */
export function readSeedAvatar(username: string): Promise<Uint8Array> {
  return readFile(seedAvatarPath(username));
}

/**
 * Seed avatars are shared demo assets, keyed by username rather than user id, so uploading
 * them before the users exist is possible and re-seeding overwrites them in place.
 */
export function seedAvatarKey(username: string): string {
  return `seed/avatars/${username}.svg`;
}
