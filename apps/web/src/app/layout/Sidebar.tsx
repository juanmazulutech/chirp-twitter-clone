import { NavLink } from 'react-router';

import { RailComposeButton } from './ComposeButton';
import { useNavItems } from './nav-items';

/**
 * The left rail from 640px: icons only on tablets, icons and labels from 1024px.
 * The current page is marked by aria-current, a bolder label and a tinted pill, as well
 * as by airmail blue, so it never relies on colour alone.
 */
export function Sidebar() {
  const navItems = useNavItems();
  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col items-center gap-4 px-3 pt-16 pb-6 sm:flex lg:w-60 lg:items-stretch">
      <nav aria-label="Primary">
        <ul className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                aria-label={label}
                className={({ isActive }) =>
                  [
                    'flex size-12 items-center justify-center gap-4 rounded-full text-lg no-underline transition-colors duration-150 lg:h-12 lg:w-full lg:justify-start lg:px-4',
                    isActive
                      ? 'bg-paper font-bold text-airmail-blue'
                      : 'font-medium text-ink hover:bg-paper',
                  ].join(' ')
                }
              >
                <Icon aria-hidden="true" className="size-6 shrink-0" strokeWidth={1.75} />
                <span className="hidden lg:inline">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <RailComposeButton />
    </aside>
  );
}
