// Cross-likes: every persona likes 10–30 chirps by people they follow. Listing ~240 likes by
// hand would bury the persona data in noise, so they are picked by a seeded generator instead:
// the same follow graph and chirps always produce the same likes, run after run.
import type { SeedTweet } from './tweets';

export const SEED_LIKES_MIN = 10;
export const SEED_LIKES_MAX = 30;

/** A seed chirp by its author and its position in that author's list. */
export interface SeedTweetRef {
  author: string;
  index: number;
}

/** FNV-1a: a stable 32-bit seed from a username. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32: a tiny deterministic generator returning numbers in [0, 1). */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Which chirps each persona likes: distinct, and only by people they follow. */
export function pickSeedLikes(
  follows: Record<string, string[]>,
  tweets: Record<string, SeedTweet[]>,
): Record<string, SeedTweetRef[]> {
  return Object.fromEntries(
    Object.entries(follows).map(([liker, followed]) => {
      const random = seededRandom(hashString(liker));
      const candidates = followed.flatMap((author) =>
        (tweets[author] ?? []).map((_, index) => ({ author, index })),
      );
      // Fisher–Yates, then keep a persona-specific number of the shuffled chirps.
      for (let i = candidates.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [candidates[i], candidates[j]] = [
          candidates[j] as SeedTweetRef,
          candidates[i] as SeedTweetRef,
        ];
      }
      const count = SEED_LIKES_MIN + Math.floor(random() * (SEED_LIKES_MAX - SEED_LIKES_MIN + 1));
      return [liker, candidates.slice(0, count)];
    }),
  );
}

/**
 * When a persona liked a chirp: some minutes after it was posted, or after the persona
 * joined when the chirp is older than their account, and never later than `now`.
 */
export function seedLikeDate(
  now: Date,
  tweetDate: Date,
  likerJoinedAt: Date,
  delayMinutes: number,
): Date {
  const start = Math.max(tweetDate.getTime(), likerJoinedAt.getTime());
  return new Date(Math.min(start + delayMinutes * 60_000, now.getTime()));
}
