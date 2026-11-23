import type { Notification } from '@chirp/shared';

/** What the actor did, after their name: "Ana Torres liked your chirp". */
export function notificationAction(notification: Notification): string {
  switch (notification.type) {
    case 'FOLLOW':
      return 'followed you';
    case 'LIKE':
      return 'liked your chirp';
    case 'REPLY':
      return 'replied to your chirp';
  }
}

/**
 * Where a notification leads: the new follower's profile, the liked chirp (the viewer's own)
 * or the reply's conversation.
 */
export function notificationPath(notification: Notification, viewerUsername: string): string {
  switch (notification.type) {
    case 'FOLLOW':
      return `/${notification.actor.username}`;
    case 'LIKE':
      return `/${viewerUsername}/status/${notification.tweet.id}`;
    case 'REPLY':
      return `/${notification.actor.username}/status/${notification.tweet.id}`;
  }
}

/** The badge's figure; past 9 it reads "9+" so it keeps its size. */
export function badgeFigure(count: number): string {
  return count > 9 ? '9+' : String(count);
}

/** The navigation link's accessible name, which carries the exact count. */
export function notificationsLinkLabel(count: number): string {
  return count > 0 ? `Notifications, ${count} unread` : 'Notifications';
}
