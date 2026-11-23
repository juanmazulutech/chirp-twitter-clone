import { Button } from '@/components/ui/Button';

import { appearanceOption } from '../appearance-options';
import { useAppearanceStore } from '../store';

/** The icon shows the current choice; the dialog names it in words. */
function useAppearanceButton() {
  const appearance = useAppearanceStore((state) => state.appearance);
  const openDialog = useAppearanceStore((state) => state.openDialog);
  return { Icon: appearanceOption(appearance).icon, openDialog };
}

/** In the rail's foot, shaped like Sign out beneath it: icon only on tablets, labelled from 1024px. */
export function RailAppearanceButton() {
  const { Icon, openDialog } = useAppearanceButton();
  return (
    <button
      type="button"
      aria-label="Appearance"
      aria-haspopup="dialog"
      onClick={openDialog}
      className="flex size-12 items-center justify-center gap-4 rounded-full text-lg font-medium text-ink-muted transition-colors duration-150 hover:bg-paper hover:text-ink lg:h-12 lg:w-full lg:justify-start lg:px-4"
    >
      <Icon aria-hidden="true" className="size-6 shrink-0" strokeWidth={1.75} />
      <span className="hidden lg:inline">Appearance</span>
    </button>
  );
}

/** Phones have no rail: the header's trailing icons hold appearance and sign-out. */
export function HeaderAppearanceButton() {
  const { Icon, openDialog } = useAppearanceButton();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Appearance"
      aria-haspopup="dialog"
      onClick={openDialog}
      className="ml-auto sm:hidden"
    >
      <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
    </Button>
  );
}
