import type { Page, Tweet } from '@chirp/shared';
import type { InfiniteData } from '@tanstack/react-query';

type TweetPages = InfiniteData<Page<Tweet>, unknown>;

/** Whether cached data is an infinite list of chirps (every list under `tweetKeys.all` is). */
export function isTweetPages(data: unknown): data is TweetPages {
  return typeof data === 'object' && data !== null && 'pages' in data && Array.isArray(data.pages);
}

/** Applies `update` to every copy of chirp `tweetId`; pages without it keep their identity. */
export function updateTweetInPages<T extends TweetPages>(
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
