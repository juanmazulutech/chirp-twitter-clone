import type { ReactNode } from 'react';
import { NavLink } from 'react-router';

/**
 * Tabs that are places: each tab has its own address, so it can be shared and reloaded. They
 * are links in a named `nav`, marked current with `aria-current`, not an ARIA tablist.
 */
export function NavTabs({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label} className="grid auto-cols-fr grid-flow-col border-b border-hairline">
      {children}
    </nav>
  );
}

/**
 * One tab. Switching tabs replaces the history entry, so Back leaves the page instead of
 * stepping through its tabs; `end` keeps `/ana` from also matching `/ana/replies`.
 */
export function NavTab({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      replace
      className={({ isActive }) =>
        `grid place-items-center pt-3 text-sm transition-colors duration-150 hover:bg-paper ${
          isActive ? 'font-bold text-airmail-blue' : 'font-medium text-ink-muted'
        }`
      }
    >
      {({ isActive }) => (
        // The bar marks the current tab beside the bold label, colour and aria-current.
        <span
          className={`border-b-[3px] pb-2.5 ${isActive ? 'border-airmail-blue' : 'border-transparent'}`}
        >
          {children}
        </span>
      )}
    </NavLink>
  );
}
