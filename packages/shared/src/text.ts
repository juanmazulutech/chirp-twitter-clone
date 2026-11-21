/**
 * Counts Unicode code points rather than UTF-16 code units, so `'👍'` counts as 1
 * instead of 2. This matches how PostgreSQL measures `varchar(n)`, keeping the
 * client counter, API validation and database constraint in agreement.
 *
 * Multi-code-point sequences (flags, skin tones, ZWJ families) count once per
 * code point. Twitter's weighted counting (double-width emoji, fixed-length URLs)
 * is intentionally not replicated.
 */
export function countCharacters(text: string): number {
  let count = 0;
  for (const _codePoint of text) count++;
  return count;
}
