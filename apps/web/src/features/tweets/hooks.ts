import type { Page, Tweet } from '@chirp/shared';
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRef } from 'react';

import { profileKeys } from '@/features/profile/keys';
import { isApiError } from '@/lib/api-client';
import { notify } from '@/lib/notify';

import { createTweet, deleteTweet, getTimeline, setLike } from './api';
import { tweetKeys } from './keys';
import { isTweetPages, removeTweetFromPages, updateTweetInPages, withLike } from './tweet-cache';

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
      // The author's profile counts it, and their chirp list starts with it.
      const author = tweet.author.username;
      void queryClient.invalidateQueries({ queryKey: profileKeys.detail(author) });
      void queryClient.invalidateQueries({ queryKey: tweetKeys.byUser(author) });
    },
  });
}

/** Rewrites chirp `tweetId` in every cached list of chirps (the timeline now, profiles later). */
function updateCachedTweet(
  queryClient: QueryClient,
  tweetId: string,
  update: (tweet: Tweet) => Tweet,
): void {
  queryClient.setQueriesData({ queryKey: tweetKeys.all }, (data: unknown) =>
    isTweetPages(data) ? updateTweetInPages(data, tweetId, update) : data,
  );
}

/**
 * Likes or unlikes a chirp optimistically: every cached copy changes at once. Quick toggles
 * reach the server in order, so only the newest one speaks for the final state: its answer
 * replaces the guessed count, and only its failure rolls back and tells the user. An older
 * toggle that settles late (either way) is ignored, since a newer one already overrode it.
 */
export function useLikeTweet(tweetId: string) {
  const queryClient = useQueryClient();
  const latestToggle = useRef(0);
  return useMutation({
    mutationFn: (liked: boolean) => setLike(tweetId, liked),
    onMutate: async (liked) => {
      latestToggle.current += 1;
      const toggle = latestToggle.current;
      // A list fetch already on its way would land with the old state on top of this one.
      await queryClient.cancelQueries({ queryKey: tweetKeys.all });
      updateCachedTweet(queryClient, tweetId, (tweet) => withLike(tweet, liked));
      return { toggle };
    },
    onError: (_error, liked, context) => {
      if (context?.toggle !== latestToggle.current) return;
      updateCachedTweet(queryClient, tweetId, (tweet) => withLike(tweet, !liked));
      notify.error(
        liked ? 'The like didn’t go through. Try again.' : 'The like wasn’t removed. Try again.',
      );
    },
    onSuccess: ({ liked, likeCount }, _liked, context) => {
      if (context.toggle !== latestToggle.current) return;
      updateCachedTweet(queryClient, tweetId, (tweet) => ({
        ...tweet,
        likedByMe: liked,
        likeCount,
      }));
    },
  });
}

/**
 * Deletes one of the viewer's chirps and drops it from every cached list. A chirp already
 * gone (404) counts as deleted: what the user wanted is true either way.
 */
export function useDeleteTweet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tweetId: string) => {
      try {
        await deleteTweet(tweetId);
      } catch (error) {
        if (!isApiError(error, 404)) throw error;
      }
    },
    onSuccess: (_result, tweetId) => {
      queryClient.setQueriesData({ queryKey: tweetKeys.all }, (data: unknown) =>
        isTweetPages(data) ? removeTweetFromPages(data, tweetId) : data,
      );
      // Only the author can delete, so only their profile's chirp count changed.
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}
