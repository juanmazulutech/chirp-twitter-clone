import { X } from 'lucide-react';
import {
  createContext,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  use,
  useEffect,
  useId,
  useRef,
} from 'react';

import { lockPageScroll } from './scroll-lock';

const ModalContext = createContext<{ titleId: string } | null>(null);

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A modal dialog on the native `<dialog>`: the browser traps focus, closes on
 * Escape and restores focus to the opener. Clicking the backdrop also closes it.
 *
 *   <Modal open={open} onClose={close}>
 *     <ModalTitle>Delete chirp?</ModalTitle>
 *     <ModalBody>This can't be undone.</ModalBody>
 *     <ModalActions>…buttons…</ModalActions>
 *   </Modal>
 */
export function Modal({ open, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // A drag that starts inside (e.g. selecting text) and ends on the backdrop is not a backdrop click.
  const pressStartedOnBackdrop = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Native modals do not stop the page behind them from scrolling.
    return lockPageScroll();
  }, [open]);

  function rememberPressTarget(event: PointerEvent<HTMLDialogElement>) {
    pressStartedOnBackdrop.current = event.target === event.currentTarget;
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (pressStartedOnBackdrop.current && event.target === event.currentTarget) onClose();
    pressStartedOnBackdrop.current = false;
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onPointerDown={rememberPressTarget}
      onClick={closeOnBackdrop}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card border border-hairline bg-sheet p-0 text-ink backdrop:bg-scrim"
    >
      <ModalContext value={{ titleId }}>
        {/* Inner wrapper so clicks inside the content never count as backdrop clicks. */}
        <div className="relative flex flex-col gap-4 p-6">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-paper hover:text-ink"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </button>
          {children}
        </div>
      </ModalContext>
    </dialog>
  );
}

export function ModalTitle({ children }: { children: ReactNode }) {
  const modal = use(ModalContext);
  if (!modal) throw new Error('<ModalTitle> must be rendered inside <Modal>');
  return (
    <h2 id={modal.titleId} className="pr-10 text-lg font-semibold">
      {children}
    </h2>
  );
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="text-[0.9375rem] leading-5 text-ink-muted">{children}</div>;
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-3 pt-2">{children}</div>;
}
