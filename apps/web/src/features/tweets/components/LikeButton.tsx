import type { Tweet } from '@chirp/shared';
import { Heart } from 'lucide-react';
import { Link } from 'react-router';

import { useLikeTweet } from '../hooks';
import { tweetPath } from '../tweet-path';

function likesLabel(count: number): string {
  return count === 1 ? '1 like' : `${count.toLocaleString('en')} likes`;
}

interface LikeButtonProps {
  tweet: Pick<Tweet, 'id' | 'author' | 'likeCount' | 'likedByMe'>;
}

/**
 * The like toggle with the chirp's like count. Liked is marked three ways, never by colour
 * alone: `aria-pressed`, a filled heart and airmail red (DESIGN.md, the Red Letter Rule).
 * Wherever the chirp appears, a non-zero count leads to the people who liked it.
 */
export function LikeButton({ tweet }: LikeButtonProps) {
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
      {tweet.likeCount > 0 ? (
        <Link
          to={`${tweetPath(tweet)}/likes`}
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
