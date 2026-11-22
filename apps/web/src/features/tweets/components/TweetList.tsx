import type { Page, Tweet } from '@chirp/shared';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { InfiniteList } from '@/components/ui/InfiniteList';

import { TweetCard } from './TweetCard';

interface TweetListProps {
  /** Any infinite query of `Page<Tweet>`: the home timeline, a profile's chirps. */
  query: UseInfiniteQueryResult<InfiniteData<Page<Tweet>, string | undefined>>;
  /** Accessible name of the list, e.g. "Home timeline". */
  label: string;
  /** What to show when the first page comes back empty. */
  empty: ReactNode;
}

/** A feed of chirps that loads the next page as the reader nears the end. */
export function TweetList({ query, label, empty }: TweetListProps) {
  return (
    <InfiniteList
      query={query}
      label={label}
      noun="chirps"
      getKey={(tweet) => tweet.id}
      renderItem={(tweet) => <TweetCard tweet={tweet} />}
      empty={empty}
      // Rows off screen skip layout and paint; the size hint keeps the scrollbar steady.
      rowClassName="[contain-intrinsic-size:auto_7rem] [content-visibility:auto]"
    />
  );
}
