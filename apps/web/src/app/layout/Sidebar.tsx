import { NavLink } from 'react-router';

import { RailAppearanceButton } from '@/features/appearance/components/AppearanceButton';
import { NotificationsBadge } from '@/features/notifications/components/NotificationsBadge';

import { RailComposeButton } from './ComposeButton';
import { useNavItems } from './nav-items';
import { RailSignOutButton } from './SignOutButton';

/**
 * The left rail from 640px: icons only on tablets, icons and labels from 1024px.
 * The current page is marked by aria-current, a bolder label and a tinted pill, as well
 * as by airmail blue, so it never relies on colour alone. Appearance and signing out sit at
 * the foot, away from the destinations.
 */
export function Sidebar() {
  const navItems = useNavItems();
  return (
    // A plain container: the "Primary" nav inside is the landmark, and a second unnamed
    // complementary region beside the right panel would read as a duplicate.
    <div className="sticky top-0 hidden h-dvh shrink-0 flex-col items-center gap-4 px-3 pt-16 pb-6 sm:flex lg:w-60 lg:items-stretch">
      <nav aria-label="Primary">
        <ul className="flex flex-col gap-1">
          {navItems.map(({ to, label, accessibleName, icon: Icon, badge = 0 }) => (
            <li key={to}>
              <NavLink
                to={to}
                aria-label={accessibleName}
                className={({ isActive }) =>
                  [
                    'flex size-12 items-center justify-center gap-4 rounded-full text-lg no-underline transition-colors duration-150 lg:h-12 lg:w-full lg:justify-start lg:px-4',
                    isActive
                      ? 'bg-paper font-bold text-airmail-blue'
                      : 'font-medium text-ink hover:bg-paper',
                  ].join(' ')
                }
              >
                <span className="relative shrink-0">
                  <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
                  <NotificationsBadge count={badge} className="-top-1.5 -right-2" />
                </span>
                <span className="hidden lg:inline">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <RailComposeButton />
      <div className="mt-auto flex flex-col items-center gap-1 lg:items-stretch">
        <RailAppearanceButton />
        <RailSignOutButton />
      </div>
    </div>
  );
}
