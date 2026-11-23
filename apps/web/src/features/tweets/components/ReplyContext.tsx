import type { Tweet } from '@chirp/shared';

/** The chirp being answered, quoted above the reply box so the writer keeps it in view. */
export function ReplyContext({ tweet }: { tweet: Tweet }) {
  return (
    <figure className="border-l-2 border-hairline pl-3">
      <figcaption className="truncate text-sm">
        <span className="font-semibold text-ink">{tweet.author.displayName}</span>{' '}
        <span className="text-ink-muted">@{tweet.author.username}</span>
      </figcaption>
      <blockquote className="mt-1 line-clamp-3 text-sm wrap-anywhere whitespace-pre-wrap text-ink-muted">
        {tweet.content}
      </blockquote>
    </figure>
  );
}
