// Literal class names so Tailwind generates them; each pairs white text at >= 5.4:1.
const fallbackColors = [
  'bg-avatar-1',
  'bg-avatar-2',
  'bg-avatar-3',
  'bg-avatar-4',
  'bg-avatar-5',
  'bg-avatar-6',
] as const;

/** Up to two initials from the display name, uppercase; "?" when there are none. */
export function initialsOf(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('');
  return initials ? initials.toLocaleUpperCase() : '?';
}

/** The same user always gets the same colour. */
export function avatarColorOf(userId: string): (typeof fallbackColors)[number] {
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return fallbackColors[hash % fallbackColors.length] ?? fallbackColors[0];
}
