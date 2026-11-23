import {
  type CreateReplyBody,
  type CreateTweetBody,
  type LikeState,
  likeStateSchema,
  pageSchema,
  type Tweet,
  tweetAncestorsSchema,
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

/** Posts a reply to chirp `tweetId` as the signed-in user. */
export function createReply(tweetId: string, body: CreateReplyBody): Promise<Tweet> {
  return apiRequest(`/tweets/${tweetId}/replies`, { method: 'POST', body, schema: tweetSchema });
}

/** One chirp, as the signed-in user sees it. */
export function getTweet(tweetId: string, signal?: AbortSignal): Promise<Tweet> {
  return apiRequest(`/tweets/${tweetId}`, { schema: tweetSchema, signal });
}

/** The chirps a reply answers, root first (at most the nearest `THREAD_ANCESTORS_MAX`). */
export function getAncestors(tweetId: string, signal?: AbortSignal) {
  return apiRequest(`/tweets/${tweetId}/ancestors`, { schema: tweetAncestorsSchema, signal });
}

/** One page of a chirp's direct replies, oldest first. */
export function getReplies(tweetId: string, cursor: string | undefined, signal?: AbortSignal) {
  const query = cursor ? `?${new URLSearchParams({ cursor }).toString()}` : '';
  return apiRequest(`/tweets/${tweetId}/replies${query}`, { schema: tweetPageSchema, signal });
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
