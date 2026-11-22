import { type FollowListUser, type Page, searchTermSchema } from '@chirp/shared';
import { type InfiniteData, keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { searchUsers } from './api';
import { searchKeys } from './keys';

export type UserSearchData = InfiniteData<Page<FollowListUser>, string | undefined>;

/** The term the API will search for (trimmed, without a leading "@"), or null if there is none. */
export function cleanSearchTerm(text: string): string | null {
  const parsed = searchTermSchema.safeParse(text);
  return parsed.success ? parsed.data : null;
}

/**
 * People matching `term`, a page at a time. While a new term loads, the previous results stay
 * on screen instead of flashing a spinner on every keystroke.
 */
export function useUserSearch(term: string | null) {
  return useInfiniteQuery<
    Page<FollowListUser>,
    Error,
    UserSearchData,
    ReturnType<typeof searchKeys.users>,
    string | undefined
  >({
    queryKey: searchKeys.users(term ?? ''),
    queryFn: ({ pageParam, signal }) => searchUsers(term ?? '', pageParam, signal),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: term !== null,
    placeholderData: keepPreviousData,
  });
}
