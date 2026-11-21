import { Outlet } from 'react-router';

import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { ComposeFab } from './ComposeButton';
import { ComposerModal } from './ComposerModal';
import { RightPanel } from './RightPanel';
import { Sidebar } from './Sidebar';

/**
 * The signed-in frame. Phone: header, full-width feed, bottom navigation and the compose
 * button. 640px: an icon rail beside a 600px column. 1024px: labelled rail and search panel.
 */
export function AppShell() {
  return (
    <>
      <a
        href="#main"
        // Parked above the viewport rather than sr-only: `not-sr-only` would reset its padding.
        className="fixed top-2 left-2 z-30 -translate-y-24 rounded-full border border-hairline bg-sheet px-4 py-2 font-semibold text-airmail-blue focus:translate-y-0"
      >
        Skip to content
      </a>
      <div className="mx-auto flex min-h-dvh justify-center">
        <Sidebar />
        <div className="flex w-full min-w-0 flex-col bg-sheet sm:max-w-150 sm:border-x sm:border-hairline">
          <AppHeader />
          {/* Clears the fixed bottom navigation on phones. */}
          <main
            id="main"
            tabIndex={-1}
            className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] outline-none sm:pb-0"
          >
            <Outlet />
          </main>
        </div>
        <RightPanel />
      </div>
      <BottomNav />
      <ComposeFab />
      <ComposerModal />
    </>
  );
}
