import type { Tweet } from '@chirp/shared';
import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { Postmark } from '@/components/ui/Postmark';
import { useSession } from '@/features/auth/hooks';

import { tweetPath } from '../tweet-path';
import { DeleteTweetButton } from './DeleteTweetButton';
import { LikeButton } from './LikeButton';
import { ReplyButton } from './ReplyButton';
import { ReplyingTo } from './ReplyingTo';

/**
 * One chirp in a feed: who sent it, what it says, and the postmark of when. The postmark
 * opens the chirp's own page, with its thread.
 */
export function TweetCard({ tweet }: { tweet: Tweet }) {
  const { author } = tweet;
  const { user } = useSession();

  return (
    <article
      aria-label={`Chirp by ${author.displayName}`}
      className="relative grid grid-cols-[2.75rem_1fr] gap-3 px-4 py-3"
    >
      <Avatar name={author.displayName} userId={author.id} src={author.avatarUrl} />
      {/* The right padding keeps the text clear of the postmark. */}
      <div className="min-w-0 pr-16">
        <p className="flex min-w-0 items-baseline gap-1 text-sm">
          <Link
            to={`/${author.username}`}
            className="truncate font-semibold text-ink underline-offset-2 hover:underline"
          >
            {author.displayName}
          </Link>
          <span className="truncate text-ink-muted">@{author.username}</span>
        </p>
        {tweet.replyTo ? <ReplyingTo username={tweet.replyTo.author.username} /> : null}
        <p className="mt-1 text-[0.9375rem] leading-5 wrap-anywhere whitespace-pre-wrap text-ink">
          {tweet.content}
        </p>
        {tweet.imageUrl ? (
          // A fixed 16:9 frame: images load lazily without shifting the feed under the reader.
          <img
            src={tweet.imageUrl}
            alt={`Image shared by ${author.displayName}`}
            loading="lazy"
            decoding="async"
            className="mt-2 aspect-video w-full rounded-lg border border-hairline bg-paper object-cover"
          />
        ) : null}
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ReplyButton tweet={tweet} />
            <LikeButton tweet={tweet} />
          </div>
          {user?.id === author.id ? <DeleteTweetButton tweet={tweet} /> : null}
        </div>
      </div>
      <Link
        to={tweetPath(tweet)}
        className="absolute top-2.5 right-3.5 rounded-full transition-opacity duration-150 hover:opacity-80"
      >
        <span className="sr-only">Open chirp, </span>
        <Postmark dateTime={tweet.createdAt} />
      </Link>
    </article>
  );
}
