import type { Page } from '@chirp/shared';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from './Button';
import { Spinner } from './Spinner';
import { useLoadMore } from './use-load-more';

interface InfiniteListProps<Item> {
  /** Any infinite query of `Page<Item>`. */
  query: UseInfiniteQueryResult<InfiniteData<Page<Item>, unknown>>;
  /** Accessible name of the list, e.g. "Home timeline". */
  label: string;
  /** What the list holds, plural and lowercase ("chirps", "people"), for loading and errors. */
  noun: string;
  getKey: (item: Item) => string;
  renderItem: (item: Item) => ReactNode;
  /** What to show when the first page comes back empty. */
  empty: ReactNode;
  /** What to say under the last item. */
  endMessage?: string;
  /** Extra classes for each row, e.g. a `content-visibility` size hint. */
  rowClassName?: string;
}

/**
 * An item a list can hold twice: one added here goes on top of page one, and the same item
 * may come back in a later page if the list shifted. Keeping the first copy keeps the order
 * stable and React's keys unique.
 */
function uniqueItems<Item>(pages: Page<Item>[], getKey: (item: Item) => string): Item[] {
  const seen = new Set<string>();
  return pages
    .flatMap((page) => page.items)
    .filter((item) => {
      const key = getKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * A feed that loads the next page as the reader nears the end. A failed page waits for
 * "Try again" instead of retrying on scroll, so a failing API is not hammered.
 */
export function InfiniteList<Item>({
  query,
  label,
  noun,
  getKey,
  renderItem,
  empty,
  endMessage = 'You’re all caught up.',
  rowClassName = '',
}: InfiniteListProps<Item>) {
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;
  const sentinelRef = useLoadMore(
    () => {
      void fetchNextPage();
    },
    hasNextPage && !isFetchingNextPage && !isFetchNextPageError,
  );
  const capitalized = noun.charAt(0).toUpperCase() + noun.slice(1);

  if (!data) {
    return query.isError ? (
      <section role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <CircleAlert aria-hidden="true" className="size-8 text-danger" strokeWidth={1.75} />
        <h2 className="text-lg font-semibold text-ink">{capitalized} didn’t load</h2>
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
        <Spinner label={`Loading ${noun}`} className="size-6" />
      </div>
    );
  }

  const items = uniqueItems(data.pages, getKey);
  if (items.length === 0) return empty;

  return (
    <>
      <ol aria-label={label} aria-busy={isFetchingNextPage}>
        {items.map((item) => (
          <li
            key={getKey(item)}
            className={`border-b border-hairline last:border-b-0 ${rowClassName}`}
          >
            {renderItem(item)}
          </li>
        ))}
      </ol>
      <div className="border-t border-hairline px-4 py-6 text-center text-sm text-ink-muted">
        {isFetchNextPageError ? (
          <div role="alert" className="flex flex-col items-center gap-3">
            <p className="flex items-center gap-2">
              <CircleAlert aria-hidden="true" className="size-4 text-danger" strokeWidth={1.75} />
              More {noun} didn’t load.
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
            {isFetchingNextPage ? <Spinner label={`Loading more ${noun}`} /> : null}
          </div>
        ) : (
          <p>{endMessage}</p>
        )}
      </div>
    </>
  );
}
