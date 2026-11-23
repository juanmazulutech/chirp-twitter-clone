import { Modal, ModalTitle } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Composer, ReplyComposer } from '@/features/tweets/components/Composer';
import { ReplyContext } from '@/features/tweets/components/ReplyContext';
import { useReplyTarget } from '@/features/tweets/hooks';
import { useComposerStore } from '@/features/tweets/store';

/**
 * The modal every compose and reply button opens. It stays mounted while closed, so a draft
 * survives closing it by accident: the new-chirp draft stays even while a reply is written,
 * and a reply draft lasts until another chirp is answered.
 */
export function ComposerModal() {
  const isOpen = useComposerStore((state) => state.isOpen);
  const replyToId = useComposerStore((state) => state.replyToId);
  const close = useComposerStore((state) => state.close);
  const target = useReplyTarget(replyToId);
  const replying = replyToId !== null;

  return (
    <Modal open={isOpen} onClose={close}>
      <ModalTitle>{replying ? 'Reply' : 'New chirp'}</ModalTitle>
      <div hidden={replying}>
        <Composer onPosted={close} focusOnOpen={!replying} />
      </div>
      {replying ? (
        target.data ? (
          <>
            <ReplyContext tweet={target.data} />
            <ReplyComposer
              key={target.data.id}
              replyTo={target.data}
              onPosted={close}
              focusOnOpen
            />
          </>
        ) : target.isError ? (
          <p role="alert" className="text-ink-muted">
            This chirp can’t be answered right now. It may have been deleted.
          </p>
        ) : (
          <div className="grid place-items-center py-6 text-ink-muted">
            <Spinner label="Loading chirp" className="size-5" />
          </div>
        )
      ) : null}
    </Modal>
  );
}
