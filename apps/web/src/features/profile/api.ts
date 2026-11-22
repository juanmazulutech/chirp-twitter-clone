import {
  type FollowState,
  followStateSchema,
  pageSchema,
  tweetSchema,
  userProfileSchema,
} from '@chirp/shared';

import { apiRequest } from '@/lib/api-client';

const tweetPageSchema = pageSchema(tweetSchema);

const userPath = (username: string) => `/users/${encodeURIComponent(username)}`;
const pageQuery = (cursor: string | undefined) =>
  cursor ? `?${new URLSearchParams({ cursor }).toString()}` : '';

export function getProfile(username: string, signal?: AbortSignal) {
  return apiRequest(userPath(username), { schema: userProfileSchema, signal });
}

/** One page of a user's chirps, newest first; without a cursor, the first page. */
export function getUserTweets(username: string, cursor: string | undefined, signal?: AbortSignal) {
  return apiRequest(`${userPath(username)}/tweets${pageQuery(cursor)}`, {
    schema: tweetPageSchema,
    signal,
  });
}

/** Follows or unfollows a user as the signed-in user; both are idempotent on the server. */
export function setFollow(username: string, following: boolean): Promise<FollowState> {
  return apiRequest(`${userPath(username)}/follow`, {
    method: following ? 'POST' : 'DELETE',
    schema: followStateSchema,
  });
}
