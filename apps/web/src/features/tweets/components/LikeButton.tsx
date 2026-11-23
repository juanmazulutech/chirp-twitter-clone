import type { Tweet } from '@chirp/shared';
import { Heart } from 'lucide-react';
import { Link } from 'react-router';

import { useLikeTweet } from '../hooks';

function likesLabel(count: number): string {
  return count === 1 ? '1 like' : `${count.toLocaleString('en')} likes`;
}

interface LikeButtonProps {
  tweet: Pick<Tweet, 'id' | 'likeCount' | 'likedByMe'>;
  /** Where the count leads: the people who liked it. Without it the count is plain text. */
  likersPath?: string;
}

/**
 * The like toggle with the chirp's like count. Liked is marked three ways, never by colour
 * alone: `aria-pressed`, a filled heart and airmail red (DESIGN.md, the Red Letter Rule).
 */
export function LikeButton({ tweet, likersPath }: LikeButtonProps) {
  const likeTweet = useLikeTweet(tweet.id);
  const liked = tweet.likedByMe;
  const countClasses = `text-sm tabular-nums ${liked ? 'font-semibold text-ink' : 'text-ink-muted'}`;

  return (
    <div className="-ml-2 flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Like"
        aria-pressed={liked}
        onClick={() => {
          likeTweet.mutate(!liked);
        }}
        className={`grid size-9 place-items-center rounded-full transition-colors duration-150 hover:bg-paper ${
          liked ? 'text-airmail-red' : 'text-ink-muted hover:text-airmail-red'
        }`}
      >
        <Heart
          aria-hidden="true"
          className={`size-5 ${liked ? 'fill-current' : ''}`}
          strokeWidth={1.75}
        />
      </button>
      {likersPath && tweet.likeCount > 0 ? (
        <Link
          to={likersPath}
          className={`${countClasses} underline-offset-2 hover:text-ink hover:underline`}
        >
          {likesLabel(tweet.likeCount)}
        </Link>
      ) : (
        <span className={countClasses}>{likesLabel(tweet.likeCount)}</span>
      )}
    </div>
  );
}
