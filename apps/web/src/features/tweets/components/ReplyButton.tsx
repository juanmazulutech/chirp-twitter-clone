import type { Tweet } from '@chirp/shared';
import { MessageCircle } from 'lucide-react';

import { useComposerStore } from '../store';

function repliesLabel(count: number): string {
  return count === 1 ? '1 reply' : `${count.toLocaleString('en')} replies`;
}

/**
 * Opens the compose modal to answer this chirp, with the chirp's reply count beside it.
 * Built like the like toggle, so the two read as one row of actions.
 */
export function ReplyButton({ tweet }: { tweet: Pick<Tweet, 'id' | 'replyCount'> }) {
  const openReply = useComposerStore((state) => state.openReply);

  return (
    <div className="-ml-2 flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Reply"
        onClick={() => {
          openReply(tweet.id);
        }}
        className="grid size-9 place-items-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-paper hover:text-airmail-blue"
      >
        <MessageCircle aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </button>
      <span className="text-sm text-ink-muted tabular-nums">{repliesLabel(tweet.replyCount)}</span>
    </div>
  );
}
