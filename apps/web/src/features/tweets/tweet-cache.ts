import type { Page, Tweet, TweetAncestors } from '@chirp/shared';
import type { InfiniteData } from '@tanstack/react-query';

type TweetPages = InfiniteData<Page<Tweet>, unknown>;

/** Whether cached data is an infinite list of chirps (every list under `tweetKeys.all` is). */
export function isTweetPages(data: unknown): data is TweetPages {
  return typeof data === 'object' && data !== null && 'pages' in data && Array.isArray(data.pages);
}

/** Applies `update` to every copy of chirp `tweetId`; pages without it keep their identity. */
function updateTweetInPages<T extends TweetPages>(
  data: T,
  tweetId: string,
  update: (tweet: Tweet) => Tweet,
): T {
  return {
    ...data,
    pages: data.pages.map((page) =>
      page.items.some((tweet) => tweet.id === tweetId)
        ? {
            ...page,
            items: page.items.map((tweet) => (tweet.id === tweetId ? update(tweet) : tweet)),
          }
        : page,
    ),
  };
}

/** Whether cached data is one chirp (a chirp page's `tweetKeys.detail`). */
function isTweet(data: unknown): data is Tweet {
  return typeof data === 'object' && data !== null && 'content' in data && 'author' in data;
}

/** Whether cached data is an ancestor chain (`tweetKeys.ancestors`): items without pages. */
export function isTweetAncestors(data: unknown): data is TweetAncestors {
  return (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    Array.isArray(data.items) &&
    !('nextCursor' in data)
  );
}

/**
 * Applies `update` to chirp `tweetId` in any shape cached under `tweetKeys.all`: lists of
 * pages, an ancestor chain or a single chirp. Anything else, or a cache without that chirp,
 * comes back as it was.
 */
export function updateTweetInCache(
  data: unknown,
  tweetId: string,
  update: (tweet: Tweet) => Tweet,
): unknown {
  if (isTweetPages(data)) return updateTweetInPages(data, tweetId, update);
  if (isTweetAncestors(data)) {
    if (!data.items.some((tweet) => tweet.id === tweetId)) return data;
    return { items: data.items.map((tweet) => (tweet.id === tweetId ? update(tweet) : tweet)) };
  }
  if (isTweet(data) && data.id === tweetId) return update(data);
  return data;
}

/** Drops every copy of chirp `tweetId`; cursors stay, so later pages still load. */
export function removeTweetFromPages<T extends TweetPages>(data: T, tweetId: string): T {
  return {
    ...data,
    pages: data.pages.map((page) =>
      page.items.some((tweet) => tweet.id === tweetId)
        ? { ...page, items: page.items.filter((tweet) => tweet.id !== tweetId) }
        : page,
    ),
  };
}

/** The chirp as it looks once `liked` is true or false; already in that state, unchanged. */
export function withLike(tweet: Tweet, liked: boolean): Tweet {
  if (tweet.likedByMe === liked) return tweet;
  return {
    ...tweet,
    likedByMe: liked,
    likeCount: Math.max(0, tweet.likeCount + (liked ? 1 : -1)),
  };
}
