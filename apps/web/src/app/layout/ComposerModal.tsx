import { Modal, ModalBody, ModalTitle } from '@/components/ui/Modal';
import { useComposerStore } from '@/features/tweets/store';

/** The modal every compose button opens. The composer itself replaces the body in C25. */
export function ComposerModal() {
  const isOpen = useComposerStore((state) => state.isOpen);
  const close = useComposerStore((state) => state.close);

  return (
    <Modal open={isOpen} onClose={close}>
      <ModalTitle>New chirp</ModalTitle>
      <ModalBody>Posting chirps is almost here. For now, have a look around.</ModalBody>
    </Modal>
  );
}
