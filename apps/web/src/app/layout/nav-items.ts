import { Bell, House, type LucideIcon, Search, UserRound } from 'lucide-react';

import { useSession } from '@/features/auth/hooks';
import { useUnreadCount } from '@/features/notifications/hooks';
import { notificationsLinkLabel } from '@/features/notifications/notification-copy';

export interface NavItem {
  to: string;
  label: string;
  /** The link's accessible name when it says more than `label` (an unread count). */
  accessibleName: string;
  icon: LucideIcon;
  /** Unread notifications, shown as a badge on the icon. */
  badge?: number;
}

const destinations: readonly NavItem[] = [
  { to: '/home', label: 'Home', accessibleName: 'Home', icon: House },
  { to: '/search', label: 'Search', accessibleName: 'Search', icon: Search },
];

/**
 * Primary destinations, shared by the left rail and the bottom navigation so both always
 * list the same places. Notifications and Profile appear once the session is known; the
 * unread count is polled while signed in (ADR-15).
 */
export function useNavItems(): readonly NavItem[] {
  const { user } = useSession();
  const unread = useUnreadCount({ enabled: user !== null });
  if (!user) return destinations;
  const count = unread.data?.count ?? 0;
  return [
    ...destinations,
    {
      to: '/notifications',
      label: 'Notifications',
      accessibleName: notificationsLinkLabel(count),
      icon: Bell,
      badge: count,
    },
    { to: `/${user.username}`, label: 'Profile', accessibleName: 'Profile', icon: UserRound },
  ];
}
