import type { Notification, Page } from '@chirp/shared';
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { getNotifications, getUnreadCount, markNotificationsRead } from './api';
import { notificationKeys } from './keys';

/** The badge polls rather than streams (ADR-15). */
export const UNREAD_POLL_INTERVAL_MS = 30_000;

export type NotificationsData = InfiniteData<Page<Notification>, string | undefined>;

/** The signed-in user's notifications, a page at a time; always fresh when the page opens. */
export function useNotifications() {
  return useInfiniteQuery<
    Page<Notification>,
    Error,
    NotificationsData,
    ReturnType<typeof notificationKeys.list>,
    string | undefined
  >({
    queryKey: notificationKeys.list(),
    queryFn: ({ pageParam, signal }) => getNotifications(pageParam, signal),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // The badge may already know of newer ones; a cached list would hide them.
    staleTime: 0,
  });
}

/**
 * How many notifications are unread, for the navigation badge. Polled every 30 s while the
 * tab is visible, and refreshed when the reader comes back to it.
 */
export function useUnreadCount({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: ({ signal }) => getUnreadCount(signal),
    enabled,
    staleTime: 0,
    refetchInterval: UNREAD_POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * Marks as read what the page has shown. The list keeps its fetched state, so what was new
 * stays highlighted for this visit; the badge recounts, since newer ones may have arrived.
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() }),
  });
}
