import { House, type LucideIcon, Search, UserRound } from 'lucide-react';

import { useSession } from '@/features/auth/hooks';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const destinations: readonly NavItem[] = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/search', label: 'Search', icon: Search },
];

/**
 * Primary destinations, shared by the left rail and the bottom navigation so both always
 * list the same places. Profile appears once the session is known; Notifications joins with
 * its feature (Phase 8).
 */
export function useNavItems(): readonly NavItem[] {
  const { user } = useSession();
  if (!user) return destinations;
  return [...destinations, { to: `/${user.username}`, label: 'Profile', icon: UserRound }];
}
