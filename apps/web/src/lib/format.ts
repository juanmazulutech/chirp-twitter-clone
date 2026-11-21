export interface PostmarkParts {
  /** e.g. "21 NOV" */
  day: string;
  /** e.g. "21:42" */
  time: string;
  /** e.g. "November 21, 2026 at 9:42 PM", for assistive technology */
  label: string;
}

/**
 * Splits a timestamp into the two lines of a postmark: day and 24-hour time,
 * in the viewer's time zone. The year is omitted, like a real postmark.
 */
export function formatPostmark(
  date: Date,
  { locale = 'en', timeZone }: { locale?: string; timeZone?: string } = {},
): PostmarkParts {
  // Postmarks read day first ("21 NOV") whatever the locale's order; the month name
  // still follows the locale.
  const parts = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  const day = `${part('day')} ${part('month').replace('.', '')}`.toUpperCase();

  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(date);

  const label = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone,
  }).format(date);

  return { day, time, label };
}
