import { formatPostmark } from '@/lib/format';

interface PostmarkProps {
  /** ISO timestamp of the chirp. */
  dateTime: string;
  className?: string;
}

/**
 * Chirp's signature move: every chirp is stamped with the moment it was sent,
 * like a letter. The ring is decorative: assistive technology reads the full date from the
 * visually hidden label, and `dateTime` keeps it machine-readable.
 */
export function Postmark({ dateTime, className = '' }: PostmarkProps) {
  const { day, time, label } = formatPostmark(new Date(dateTime));

  return (
    <time
      dateTime={dateTime}
      title={label}
      className={`inline-grid size-14 shrink-0 -rotate-6 place-content-center rounded-full border-[1.5px] border-airmail-blue text-center text-[0.5625rem] leading-[0.6875rem] font-semibold tracking-[0.04em] text-airmail-blue tabular-nums ${className}`}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">{day}</span>
      <span aria-hidden="true" className="text-xs leading-4">
        {time}
      </span>
      <span aria-hidden="true">CHIRP</span>
    </time>
  );
}
