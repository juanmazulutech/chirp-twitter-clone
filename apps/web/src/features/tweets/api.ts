import { type CreateTweetBody, pageSchema, type Tweet, tweetSchema } from '@chirp/shared';

import { apiRequest } from '@/lib/api-client';

const tweetPageSchema = pageSchema(tweetSchema);

/** Posts a chirp as the signed-in user and returns it as the API stored it. */
export function createTweet(body: CreateTweetBody): Promise<Tweet> {
  return apiRequest('/tweets', { method: 'POST', body, schema: tweetSchema });
}

/** One page of the home timeline, newest first; without a cursor, the first page. */
export function getTimeline(cursor: string | undefined, signal?: AbortSignal) {
  const query = cursor ? `?${new URLSearchParams({ cursor }).toString()}` : '';
  return apiRequest(`/timeline${query}`, { schema: tweetPageSchema, signal });
}
