import type { FollowListUser, Page, SessionUser, Tweet, UserProfile } from '@chirp/shared';
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
import { authKeys } from '@/features/auth/keys';
import { tweetKeys } from '@/features/tweets/keys';
import { notify } from '@/lib/notify';

import { getFollowList, getProfile, getUserTweets, setFollow, updateProfile } from './api';
import { isFollowListPages, withFollow, withFollowInPages } from './follow-cache';
import { type FollowList, profileKeys } from './keys';

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

export type FollowListData = InfiniteData<Page<FollowListUser>, string | undefined>;

/** A user's followers or the people they follow, a page at a time. */
export function useFollowList(username: string, list: FollowList) {
  return useInfiniteQuery<
    Page<FollowListUser>,
    Error,
    FollowListData,
    ReturnType<typeof profileKeys.followList>,
    string | undefined
  >({
    queryKey: profileKeys.followList(username, list),
    queryFn: ({ pageParam, signal }) => getFollowList(username, list, pageParam, signal),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/**
 * Writes whether the viewer follows `username` into every cached place that shows it: their
 * profile (with its follower count, via `updateProfile`) and their row in any follow list.
 */
function updateCachedFollow(
  queryClient: QueryClient,
  username: string,
  following: boolean,
  updateProfile: (profile: UserProfile) => UserProfile = (profile) =>
    withFollow(profile, following),
): void {
  queryClient.setQueryData<UserProfile>(profileKeys.detail(username), (profile) =>
    profile ? updateProfile(profile) : profile,
  );
  queryClient.setQueriesData({ queryKey: profileKeys.all }, (data: unknown) =>
    isFollowListPages(data) ? withFollowInPages(data, username, following) : data,
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
      // A fetch already on its way would land with the old state on top of this one.
      await queryClient.cancelQueries({ queryKey: profileKeys.all });
      updateCachedFollow(queryClient, username, following);
      return { toggle };
    },
    onError: (_error, following, context) => {
      if (context?.toggle !== latestToggle.current) return;
      updateCachedFollow(queryClient, username, !following);
      notify.error(
        following
          ? 'The follow didn’t go through. Try again.'
          : 'You’re still following. Try again.',
      );
    },
    onSuccess: ({ isFollowing, followersCount }, _following, context) => {
      if (context.toggle !== latestToggle.current) return;
      updateCachedFollow(queryClient, username, isFollowing, (profile) => ({
        ...profile,
        isFollowing,
        followersCount,
      }));
      void queryClient.invalidateQueries({ queryKey: tweetKeys.timeline });
      // The viewer's own profile and following list changed too (the key prefixes both).
      if (user) void queryClient.invalidateQueries({ queryKey: profileKeys.detail(user.username) });
    },
  });
}

/**
 * Saves the viewer's display name and bio. The profile and the session take the server's
 * answer at once; chirps and lists that show the old name are refetched.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.detail(profile.username), profile);
      queryClient.setQueryData<SessionUser | null>(authKeys.session, (session) =>
        session ? { ...session, displayName: profile.displayName, bio: profile.bio } : session,
      );
      void queryClient.invalidateQueries({ queryKey: tweetKeys.all });
      // Follow lists show the name too; the profile just set is fresh, so it is skipped.
      void queryClient.invalidateQueries({
        queryKey: profileKeys.all,
        predicate: (query) => query.queryKey.length > 2,
      });
    },
  });
}
