import { NavLink } from 'react-router';

import { useNavItems } from './nav-items';

/** Phone navigation: a 64px bar in thumb reach, hidden once the left rail appears. */
export function BottomNav() {
  const navItems = useNavItems();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-sheet pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="flex h-16">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                [
                  // Inset focus ring: the bar sits on the screen edge, where an outer ring would be clipped.
                  'flex h-full flex-col items-center justify-center gap-1 text-xs no-underline focus-visible:-outline-offset-4',
                  isActive ? 'font-bold text-airmail-blue' : 'font-medium text-ink-muted',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid h-8 w-14 place-items-center rounded-full transition-colors duration-150 ${isActive ? 'bg-paper' : ''}`}
                  >
                    <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
