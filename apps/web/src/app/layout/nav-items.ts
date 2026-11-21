import { House, type LucideIcon, Search } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Primary destinations, shared by the left rail and the bottom navigation so both always
 * list the same places. Profile joins once the session exists (C18); Notifications joins
 * with its feature (Phase 8).
 */
export const navItems: readonly NavItem[] = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/search', label: 'Search', icon: Search },
];
