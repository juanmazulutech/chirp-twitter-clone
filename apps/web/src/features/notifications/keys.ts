/** Query keys of the notifications module; other modules import them from here. */
export const notificationKeys = {
  all: ['notifications'] as const,
  /** An infinite query of `Page<Notification>`, newest first. */
  list: () => ['notifications', 'list'] as const,
  /** `{ count }` of unread notifications, polled for the navigation badge. */
  unreadCount: () => ['notifications', 'unread-count'] as const,
};
