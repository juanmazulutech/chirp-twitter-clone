import type { Notification } from '@chirp/shared';
import { Heart, type LucideIcon, MessageCircle, UserPlus } from 'lucide-react';
import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { formatPostmark } from '@/lib/format';

import { notificationAction, notificationPath } from '../notification-copy';

const icons: Record<Notification['type'], LucideIcon> = {
  FOLLOW: UserPlus,
  LIKE: Heart,
  REPLY: MessageCircle,
};

interface NotificationRowProps {
  notification: Notification;
  /** The signed-in user, whose chirp a LIKE is about. */
  viewerUsername: string;
}

/**
 * One notification: what happened, by whom and when, with the chirp it is about. An unread
 * one carries a "New" label and its own accessible name as well as the paper wash, so the
 * state never lives in colour alone.
 */
export function NotificationRow({ notification, viewerUsername }: NotificationRowProps) {
  const { actor, readAt, createdAt } = notification;
  const Icon = icons[notification.type];
  const action = notificationAction(notification);
  const unread = readAt === null;
  const { day, time, label } = formatPostmark(new Date(createdAt));

  return (
    <article
      aria-label={`${unread ? 'New: ' : ''}${actor.displayName} ${action}`}
      className={`flex gap-3 px-4 py-3 ${unread ? 'bg-paper' : ''}`}
    >
      <Icon
        aria-hidden="true"
        className="mt-2.5 size-5 shrink-0 text-ink-muted"
        strokeWidth={1.75}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Avatar name={actor.displayName} userId={actor.id} src={actor.avatarUrl} size="sm" />
          <p className="flex items-center gap-2 text-xs text-ink-muted tabular-nums">
            {unread ? (
              <span className="font-bold tracking-[0.04em] text-ink uppercase">New</span>
            ) : null}
            <time dateTime={createdAt} title={label}>
              <span className="sr-only">{label}</span>
              <span aria-hidden="true">
                {day} · {time}
              </span>
            </time>
          </p>
        </div>
        <p className="text-ink">
          <Link
            to={`/${actor.username}`}
            className="font-semibold underline-offset-2 hover:underline"
          >
            {actor.displayName}
          </Link>{' '}
          {action}
        </p>
        {notification.tweet ? (
          <Link
            to={notificationPath(notification, viewerUsername)}
            className="line-clamp-3 max-w-[65ch] text-ink-muted underline-offset-2 hover:underline"
          >
            {notification.tweet.content}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
