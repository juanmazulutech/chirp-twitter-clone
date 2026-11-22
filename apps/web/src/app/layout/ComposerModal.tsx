import { Modal, ModalTitle } from '@/components/ui/Modal';
import { Composer } from '@/features/tweets/components/Composer';
import { useComposerStore } from '@/features/tweets/store';

/**
 * The modal every compose button opens. It stays mounted while closed, so a draft survives
 * closing it by accident.
 */
export function ComposerModal() {
  const isOpen = useComposerStore((state) => state.isOpen);
  const close = useComposerStore((state) => state.close);

  return (
    <Modal open={isOpen} onClose={close}>
      <ModalTitle>New chirp</ModalTitle>
      <Composer onPosted={close} focusOnOpen />
    </Modal>
  );
}
