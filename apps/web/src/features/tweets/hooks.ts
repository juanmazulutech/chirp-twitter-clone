import type { Page, Tweet } from '@chirp/shared';
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { createTweet, getTimeline } from './api';
import { tweetKeys } from './keys';

/** The cached home timeline: pages in order, each keyed by the cursor that fetched it. */
export type TimelineData = InfiniteData<Page<Tweet>, string | undefined>;

/** The home timeline, a page at a time; `fetchNextPage` follows the last page's cursor. */
export function useTimeline() {
  return useInfiniteQuery<
    Page<Tweet>,
    Error,
    TimelineData,
    typeof tweetKeys.timeline,
    string | undefined
  >({
    queryKey: tweetKeys.timeline,
    queryFn: ({ pageParam, signal }) => getTimeline(pageParam, signal),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** The new chirp goes on top of the first page; later pages are untouched. */
function prependTweet(data: TimelineData, tweet: Tweet): TimelineData {
  const [first, ...rest] = data.pages;
  if (!first) return data;
  return { ...data, pages: [{ ...first, items: [tweet, ...first.items] }, ...rest] };
}

/**
 * Posts a chirp and puts it at the top of the cached timeline, so it appears without
 * refetching every loaded page. A timeline that was never loaded stays unloaded.
 */
export function useCreateTweet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTweet,
    onSuccess: (tweet) => {
      queryClient.setQueryData<TimelineData>(tweetKeys.timeline, (data) =>
        data ? prependTweet(data, tweet) : data,
      );
    },
  });
}
