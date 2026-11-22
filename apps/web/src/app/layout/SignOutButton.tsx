import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useLogout } from '@/features/auth/hooks';

/**
 * The rail's last item, apart from the destinations: shaped like them (icon only on
 * tablets, icon and label from 1024px) but a quiet button, since it leaves the app.
 */
export function RailSignOutButton() {
  const logout = useLogout();
  return (
    <button
      type="button"
      aria-label="Sign out"
      disabled={logout.isPending}
      aria-busy={logout.isPending || undefined}
      onClick={() => {
        logout.mutate();
      }}
      className="mt-auto flex size-12 items-center justify-center gap-4 rounded-full text-lg font-medium text-ink-muted transition-colors duration-150 hover:bg-paper hover:text-ink aria-busy:cursor-wait lg:h-12 lg:w-full lg:justify-start lg:px-4"
    >
      <LogOut aria-hidden="true" className="size-6 shrink-0" strokeWidth={1.75} />
      <span className="hidden lg:inline">Sign out</span>
    </button>
  );
}

/** Phones have no rail: the header's trailing icon signs out. */
export function HeaderSignOutButton() {
  const logout = useLogout();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Sign out"
      loading={logout.isPending}
      onClick={() => {
        logout.mutate();
      }}
      // The 48px target overhangs the header's 16px padding, so the icon lines up with it.
      className="-mr-3 ml-auto sm:hidden"
    >
      <LogOut aria-hidden="true" className="size-6" strokeWidth={1.75} />
    </Button>
  );
}
