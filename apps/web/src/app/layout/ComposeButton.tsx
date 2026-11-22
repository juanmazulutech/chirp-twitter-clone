import { PenLine } from 'lucide-react';

import { buttonClasses } from '@/components/ui/button-classes';
import { useComposerStore } from '@/features/tweets/store';

/** The rail's primary action: a round icon on tablets, the labelled "Chirp" button on desktop. */
export function RailComposeButton() {
  const open = useComposerStore((state) => state.open);
  return (
    <button
      type="button"
      aria-label="New chirp"
      onClick={open}
      // Only `lg:` overrides here: responsive variants always win over the base size.
      className={buttonClasses({
        variant: 'primary',
        size: 'icon',
        className: 'lg:w-full lg:px-5',
      })}
    >
      <PenLine aria-hidden="true" className="size-5 lg:hidden" strokeWidth={1.75} />
      <span className="hidden lg:inline">Chirp</span>
    </button>
  );
}

/** Phone only: floats bottom right, above the bottom navigation and the home indicator. */
export function ComposeFab() {
  const open = useComposerStore((state) => state.open);
  return (
    <div className="fixed right-4 bottom-[calc(4rem+1rem+env(safe-area-inset-bottom))] z-20 sm:hidden">
      <button
        type="button"
        aria-label="New chirp"
        onClick={open}
        className={buttonClasses({ variant: 'primary', size: 'icon', className: 'shadow-float' })}
      >
        <PenLine aria-hidden="true" className="size-6" strokeWidth={1.75} />
      </button>
    </div>
  );
}
