import type { Page, Tweet } from '@chirp/shared';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

import { useLoadMore } from '../use-load-more';
import { TweetCard } from './TweetCard';

type TweetPages = InfiniteData<Page<Tweet>, string | undefined>;

interface TweetListProps {
  /** Any infinite query of `Page<Tweet>`: the home timeline now, a profile's chirps later. */
  query: UseInfiniteQueryResult<TweetPages>;
  /** Accessible name of the list, e.g. "Home timeline". */
  label: string;
  /** What to show when the first page comes back empty. */
  empty: ReactNode;
}

/**
 * A chirp a page can hold twice: one posted here goes on top of page one, and the same
 * chirp may come back in a later page if the feed shifted. Keeping the first copy keeps
 * the order stable and React's keys unique.
 */
function uniqueTweets(pages: TweetPages['pages']): Tweet[] {
  const seen = new Set<string>();
  return pages
    .flatMap((page) => page.items)
    .filter((tweet) => {
      if (seen.has(tweet.id)) return false;
      seen.add(tweet.id);
      return true;
    });
}

/** A feed of chirps that loads the next page as the reader nears the end. */
export function TweetList({ query, label, empty }: TweetListProps) {
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;
  const sentinelRef = useLoadMore(
    () => {
      void fetchNextPage();
    },
    hasNextPage && !isFetchingNextPage && !isFetchNextPageError,
  );

  if (!data) {
    return query.isError ? (
      <section role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <CircleAlert aria-hidden="true" className="size-8 text-danger" strokeWidth={1.75} />
        <h2 className="text-lg font-semibold text-ink">Chirps didn’t load</h2>
        <p className="max-w-[40ch] text-ink-muted">Check your connection and try again.</p>
        <Button
          className="mt-2"
          loading={query.isFetching}
          onClick={() => {
            void query.refetch();
          }}
        >
          Try again
        </Button>
      </section>
    ) : (
      <div className="grid place-items-center px-4 py-12 text-ink-muted">
        <Spinner label="Loading chirps" className="size-6" />
      </div>
    );
  }

  const tweets = uniqueTweets(data.pages);
  if (tweets.length === 0) return empty;

  return (
    <>
      <ol aria-label={label} aria-busy={isFetchingNextPage}>
        {tweets.map((tweet) => (
          // Rows off screen skip layout and paint; the size hint keeps the scrollbar steady.
          <li
            key={tweet.id}
            className="border-b border-hairline [contain-intrinsic-size:auto_7rem] [content-visibility:auto] last:border-b-0"
          >
            <TweetCard tweet={tweet} />
          </li>
        ))}
      </ol>
      <div className="border-t border-hairline px-4 py-6 text-center text-sm text-ink-muted">
        {isFetchNextPageError ? (
          <div role="alert" className="flex flex-col items-center gap-3">
            <p className="flex items-center gap-2">
              <CircleAlert aria-hidden="true" className="size-4 text-danger" strokeWidth={1.75} />
              More chirps didn’t load.
            </p>
            <Button
              size="sm"
              onClick={() => {
                void fetchNextPage();
              }}
            >
              Try again
            </Button>
          </div>
        ) : hasNextPage ? (
          <div ref={sentinelRef} className="grid place-items-center">
            {isFetchingNextPage ? <Spinner label="Loading more chirps" /> : null}
          </div>
        ) : (
          <p>You’re all caught up.</p>
        )}
      </div>
    </>
  );
}
