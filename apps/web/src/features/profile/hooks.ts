import type { Page, Tweet, UserProfile } from '@chirp/shared';
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useRef } from 'react';

import { useSession } from '@/features/auth/hooks';
import { tweetKeys } from '@/features/tweets/keys';
import { notify } from '@/lib/notify';

import { getProfile, getUserTweets, setFollow } from './api';
import { profileKeys } from './keys';

export type UserTweetsData = InfiniteData<Page<Tweet>, string | undefined>;

export function useProfile(username: string) {
  return useQuery({
    queryKey: profileKeys.detail(username),
    queryFn: ({ signal }) => getProfile(username, signal),
  });
}

/**
 * A user's chirps, a page at a time. Kept under `tweetKeys`, so likes and deletions update
 * them like every other list of chirps.
 */
export function useUserTweets(username: string) {
  return useInfiniteQuery<
    Page<Tweet>,
    Error,
    UserTweetsData,
    ReturnType<typeof tweetKeys.byUser>,
    string | undefined
  >({
    queryKey: tweetKeys.byUser(username),
    queryFn: ({ pageParam, signal }) => getUserTweets(username, pageParam, signal),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** The profile as it looks once `following` is true or false; already in that state, unchanged. */
export function withFollow(profile: UserProfile, following: boolean): UserProfile {
  if (profile.isFollowing === following) return profile;
  return {
    ...profile,
    isFollowing: following,
    followersCount: Math.max(0, profile.followersCount + (following ? 1 : -1)),
  };
}

function updateCachedProfile(
  queryClient: QueryClient,
  username: string,
  update: (profile: UserProfile) => UserProfile,
): void {
  queryClient.setQueryData<UserProfile>(profileKeys.detail(username), (profile) =>
    profile ? update(profile) : profile,
  );
}

/**
 * Follows or unfollows `username` optimistically, like `useLikeTweet`: only the newest toggle
 * writes the server's state or rolls back. Once it settles, the home timeline and the
 * viewer's own following count are refetched, since both changed on the server.
 */
export function useFollowUser(username: string) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const latestToggle = useRef(0);
  return useMutation({
    mutationFn: (following: boolean) => setFollow(username, following),
    onMutate: async (following) => {
      latestToggle.current += 1;
      const toggle = latestToggle.current;
      await queryClient.cancelQueries({ queryKey: profileKeys.detail(username) });
      updateCachedProfile(queryClient, username, (profile) => withFollow(profile, following));
      return { toggle };
    },
    onError: (_error, following, context) => {
      if (context?.toggle !== latestToggle.current) return;
      updateCachedProfile(queryClient, username, (profile) => withFollow(profile, !following));
      notify.error(
        following
          ? 'The follow didn’t go through. Try again.'
          : 'You’re still following. Try again.',
      );
    },
    onSuccess: ({ isFollowing, followersCount }, _following, context) => {
      if (context.toggle !== latestToggle.current) return;
      updateCachedProfile(queryClient, username, (profile) => ({
        ...profile,
        isFollowing,
        followersCount,
      }));
      void queryClient.invalidateQueries({ queryKey: tweetKeys.timeline });
      if (user) void queryClient.invalidateQueries({ queryKey: profileKeys.detail(user.username) });
    },
  });
}
