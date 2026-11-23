import { badgeFigure } from '../notification-copy';

/**
 * The unread count on the Notifications icon, drawn like the postmark: an airmail-blue ring
 * on the sheet. Decorative: the link's accessible name carries the exact count.
 */
export function NotificationsBadge({
  count,
  className = '',
}: {
  count: number;
  className?: string;
}) {
  if (count === 0) return null;
  return (
    <span
      aria-hidden="true"
      className={`absolute grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full border-[1.5px] border-airmail-blue bg-sheet px-1 text-[0.625rem] leading-none font-bold text-airmail-blue tabular-nums ${className}`}
    >
      {badgeFigure(count)}
    </span>
  );
}
