import { notificationSchema, pageSchema, unreadCountSchema } from '@chirp/shared';

import { apiRequest } from '@/lib/api-client';

const notificationPageSchema = pageSchema(notificationSchema);

/** One page of the signed-in user's notifications, newest first. */
export function getNotifications(cursor: string | undefined, signal?: AbortSignal) {
  const query = cursor ? `?${new URLSearchParams({ cursor }).toString()}` : '';
  return apiRequest(`/notifications${query}`, { schema: notificationPageSchema, signal });
}

export function getUnreadCount(signal?: AbortSignal) {
  return apiRequest('/notifications/unread-count', { schema: unreadCountSchema, signal });
}

/** Marks as read everything created up to `until`: the newest notification shown (ADR-15). */
export function markNotificationsRead(until: string): Promise<void> {
  return apiRequest('/notifications/read', { method: 'POST', body: { until } });
}
