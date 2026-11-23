import type { Tweet } from '@chirp/shared';
import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { Postmark } from '@/components/ui/Postmark';
import { useSession } from '@/features/auth/hooks';
import { formatPostmark } from '@/lib/format';

import { DeleteTweetButton } from './DeleteTweetButton';
import { LikeButton } from './LikeButton';
import { ReplyButton } from './ReplyButton';
import { ReplyingTo } from './ReplyingTo';

interface FocusedTweetProps {
  tweet: Tweet;
  /** Takes the reader to the reply box below. */
  onReply: () => void;
  /** Runs once the author deletes it: its page no longer has anything to show. */
  onDeleted?: () => void;
}

/**
 * The chirp a thread page is about: the same parts as a feed row, the text a step larger and
 * the full date spelled out under it, since this is where people come to read it closely.
 */
export function FocusedTweet({ tweet, onReply, onDeleted }: FocusedTweetProps) {
  const { author } = tweet;
  const { user } = useSession();
  const sentAt = formatPostmark(new Date(tweet.createdAt)).label;

  return (
    <article
      aria-label={`Chirp by ${author.displayName}`}
      className="relative border-b border-hairline px-4 py-3"
    >
      {/* The right padding keeps the name clear of the postmark. */}
      <header className="grid grid-cols-[2.75rem_1fr] items-center gap-3 pr-16">
        <Avatar name={author.displayName} userId={author.id} src={author.avatarUrl} />
        <div className="min-w-0 text-sm">
          <Link
            to={`/${author.username}`}
            className="block truncate font-semibold text-ink underline-offset-2 hover:underline"
          >
            {author.displayName}
          </Link>
          <span className="block truncate text-ink-muted">@{author.username}</span>
        </div>
      </header>
      <div className="mt-3">
        {tweet.replyTo ? <ReplyingTo username={tweet.replyTo.author.username} /> : null}
        <p className="mt-1 text-lg leading-7 wrap-anywhere whitespace-pre-wrap text-ink">
          {tweet.content}
        </p>
        {tweet.imageUrl ? (
          <img
            src={tweet.imageUrl}
            alt={`Image shared by ${author.displayName}`}
            decoding="async"
            className="mt-3 aspect-video w-full rounded-lg border border-hairline bg-paper object-cover"
          />
        ) : null}
        <p className="mt-3 text-sm text-ink-muted tabular-nums">
          <time dateTime={tweet.createdAt}>{sentAt}</time>
        </p>
        <div className="mt-2 flex items-center justify-between border-t border-hairline pt-1">
          <div className="flex items-center gap-4">
            <ReplyButton tweet={tweet} onReply={onReply} />
            <LikeButton tweet={tweet} />
          </div>
          {user?.id === author.id ? (
            <DeleteTweetButton tweet={tweet} onDeleted={onDeleted} />
          ) : null}
        </div>
      </div>
      <Postmark dateTime={tweet.createdAt} className="absolute top-2.5 right-3.5" />
    </article>
  );
}
