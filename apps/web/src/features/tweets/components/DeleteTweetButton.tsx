import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/FormAlert';
import { Modal, ModalActions, ModalBody, ModalTitle } from '@/components/ui/Modal';
import { notify } from '@/lib/notify';

import { useDeleteTweet } from '../hooks';

/** The author's delete action: asks first, then removes the chirp from every list. */
export function DeleteTweetButton({ tweetId }: { tweetId: string }) {
  const [open, setOpen] = useState(false);
  const deleteTweet = useDeleteTweet();

  function close() {
    setOpen(false);
    deleteTweet.reset();
  }

  async function confirm() {
    try {
      await deleteTweet.mutateAsync(tweetId);
    } catch {
      // The alert inside the dialog says what went wrong; the dialog stays open to retry.
      return;
    }
    // Closed before the toast: a native dialog would cover it (DESIGN.md).
    setOpen(false);
    notify.success('Your chirp was deleted');
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete chirp"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Trash2 aria-hidden="true" className="size-4.5" strokeWidth={1.75} />
      </Button>
      <Modal open={open} onClose={close}>
        <ModalTitle>Delete chirp?</ModalTitle>
        <ModalBody>
          It will disappear from your profile and from every timeline. This can’t be undone.
        </ModalBody>
        {deleteTweet.isError ? (
          <FormAlert>The chirp wasn’t deleted. Check your connection and try again.</FormAlert>
        ) : null}
        <ModalActions>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger"
            data-autofocus
            loading={deleteTweet.isPending}
            onClick={() => {
              void confirm();
            }}
          >
            Delete
          </Button>
        </ModalActions>
      </Modal>
    </>
  );
}
