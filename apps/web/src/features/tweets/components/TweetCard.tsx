import type { Tweet } from '@chirp/shared';
import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { Postmark } from '@/components/ui/Postmark';

function likesLabel(count: number): string {
  return count === 1 ? '1 like' : `${count.toLocaleString('en')} likes`;
}

/** One chirp in a feed: who sent it, what it says, and the postmark of when. */
export function TweetCard({ tweet }: { tweet: Tweet }) {
  const { author } = tweet;

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
        <p className="mt-1 text-[0.9375rem] leading-5 wrap-anywhere whitespace-pre-wrap text-ink">
          {tweet.content}
        </p>
        <p className="mt-2 text-sm text-ink-muted tabular-nums">{likesLabel(tweet.likeCount)}</p>
      </div>
      <Postmark dateTime={tweet.createdAt} className="absolute top-2.5 right-3.5" />
    </article>
  );
}
