import {
  type CreateTweetBody,
  type LikeState,
  likeStateSchema,
  pageSchema,
  type Tweet,
  tweetSchema,
} from '@chirp/shared';

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

/** Likes or unlikes a chirp as the signed-in user; both are idempotent on the server. */
export function setLike(tweetId: string, liked: boolean): Promise<LikeState> {
  return apiRequest(`/tweets/${tweetId}/like`, {
    method: liked ? 'POST' : 'DELETE',
    schema: likeStateSchema,
  });
}

/** Deletes one of the signed-in user's own chirps. */
export function deleteTweet(tweetId: string): Promise<void> {
  return apiRequest(`/tweets/${tweetId}`, { method: 'DELETE' });
}
