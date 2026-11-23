import { THREAD_ANCESTORS_MAX, type Tweet } from '@chirp/shared';
import { ArrowUp } from 'lucide-react';
import { Link } from 'react-router';

import { tweetPath } from '../tweet-path';
import { TweetCard } from './TweetCard';

/**
 * The chirps a reply answers, root first, joined by a thread line from each avatar down to
 * the next one. No hairlines between them: they read as one conversation, not a feed.
 */
export function ThreadAncestors({ ancestors }: { ancestors: Tweet[] }) {
  const [topmost] = ancestors;
  // The API stops at the nearest ancestors; the topmost still says what it answers.
  const earlier = ancestors.length >= THREAD_ANCESTORS_MAX ? topmost?.replyTo : null;

  return (
    <>
      {earlier ? (
        <Link
          to={tweetPath(earlier)}
          className="flex items-center gap-2 border-b border-hairline px-4 py-3 text-sm font-semibold text-airmail-blue underline-offset-2 hover:underline"
        >
          <ArrowUp aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Show earlier chirps
        </Link>
      ) : null}
      <ol aria-label="Earlier in this conversation">
        {ancestors.map((tweet) => (
          <li key={tweet.id} className="relative">
            {/* From under this avatar (12px row padding + 44px avatar + 4px) into the next row. */}
            <span
              aria-hidden="true"
              className="absolute top-15 -bottom-3 left-[2.3125rem] z-10 w-0.5 rounded-full bg-hairline"
            />
            <TweetCard tweet={tweet} />
          </li>
        ))}
      </ol>
    </>
  );
}
