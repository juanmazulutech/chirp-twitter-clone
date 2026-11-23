import type { Tweet } from '@chirp/shared';

/** Where a chirp lives: under its author, like a profile's own pages. */
export function tweetPath(tweet: Pick<Tweet, 'id' | 'author'>): string {
  return `/${tweet.author.username}/status/${tweet.id}`;
}
