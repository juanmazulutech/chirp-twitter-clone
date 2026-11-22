import { type CreateTweetBody, type Tweet, tweetSchema } from '@chirp/shared';

import { apiRequest } from '@/lib/api-client';

/** Posts a chirp as the signed-in user and returns it as the API stored it. */
export function createTweet(body: CreateTweetBody): Promise<Tweet> {
  return apiRequest('/tweets', { method: 'POST', body, schema: tweetSchema });
}
