import { useEffect, useRef } from 'react';

import { PageHeading } from '@/app/layout/PageHeading';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfiniteList } from '@/components/ui/InfiniteList';
import { useSession } from '@/features/auth/hooks';

import { NotificationRow } from '../components/NotificationRow';
import { useMarkNotificationsRead, useNotifications } from '../hooks';

/**
 * Follows, likes and replies, newest first. Opening the page marks as read what it shows
 * (ADR-15): up to the newest notification of the first page, once per visit.
 */
export function NotificationsPage() {
  const { user } = useSession();
  const notifications = useNotifications();
  const markRead = useMarkNotificationsRead();
  const { mutate } = markRead;
  const markedUntil = useRef<string | null>(null);

  const firstPage = notifications.data?.pages[0];
  const newest = firstPage?.items[0];
  const hasUnread = firstPage?.items.some((item) => item.readAt === null) ?? false;

  useEffect(() => {
    if (!newest || !hasUnread || markedUntil.current === newest.createdAt) return;
    markedUntil.current = newest.createdAt;
    mutate(newest.createdAt);
  }, [newest, hasUnread, mutate]);

  return (
    <>
      <PageHeading title="Notifications" />
      <InfiniteList
        query={notifications}
        label="Notifications"
        noun="notifications"
        getKey={(notification) => notification.id}
        renderItem={(notification) => (
          <NotificationRow notification={notification} viewerUsername={user?.username ?? ''} />
        )}
        empty={
          <EmptyState
            title="Nothing here yet"
            description="When someone follows you, likes your chirps or replies to them, you’ll see it here."
          />
        }
        endMessage="That’s every notification."
      />
    </>
  );
}
