import type { Tweet } from '@chirp/shared';
import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router';

import { type ConversationState, repliesLabel, replyActionClasses } from '../reply-label';
import { tweetPath } from '../tweet-path';

type ReplyTarget = Pick<Tweet, 'id' | 'author' | 'replyCount'>;

const icon = <MessageCircle aria-hidden="true" className="size-5" strokeWidth={1.75} />;

/**
 * A chirp's reply action in a feed: it opens the conversation, so the reader sees what was
 * already said before answering, with the cursor waiting in the reply box.
 */
export function ReplyLink({ tweet }: { tweet: ReplyTarget }) {
  const state: ConversationState = { focusReply: true };
  return (
    <Link
      to={tweetPath(tweet)}
      state={state}
      aria-label={`Reply, ${repliesLabel(tweet.replyCount)}`}
      className={`group ${replyActionClasses.group} hover:text-airmail-blue`}
    >
      <span className={`${replyActionClasses.icon} group-hover:bg-paper`}>{icon}</span>
      {repliesLabel(tweet.replyCount)}
    </Link>
  );
}

/** The same action on the conversation's own chirp, where the reply box is already below. */
export function ReplyButton({
  tweet,
  onReply,
}: {
  tweet: Pick<Tweet, 'replyCount'>;
  onReply: () => void;
}) {
  return (
    <div className={replyActionClasses.group}>
      <button
        type="button"
        // Not "Reply": that is the reply box's submit button just below.
        aria-label="Write a reply"
        onClick={onReply}
        className={`${replyActionClasses.icon} hover:bg-paper hover:text-airmail-blue`}
      >
        {icon}
      </button>
      {repliesLabel(tweet.replyCount)}
    </div>
  );
}
