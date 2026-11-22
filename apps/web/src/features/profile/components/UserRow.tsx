import type { FollowListUser } from '@chirp/shared';
import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { useSession } from '@/features/auth/hooks';

import { FollowButton } from './FollowButton';

/** One person in a list: who they are, a link to their profile, and a follow toggle. */
export function UserRow({ user }: { user: FollowListUser }) {
  const { user: viewer } = useSession();

  return (
    <article aria-label={user.displayName} className="flex items-center gap-3 px-4 py-3">
      <Avatar name={user.displayName} userId={user.id} src={user.avatarUrl} />
      <div className="min-w-0 flex-1 text-sm">
        <Link
          to={`/${user.username}`}
          className="block truncate font-semibold text-ink underline-offset-2 hover:underline"
        >
          {user.displayName}
        </Link>
        <p className="truncate text-ink-muted">@{user.username}</p>
      </div>
      {viewer?.id === user.id ? null : (
        <FollowButton username={user.username} isFollowing={user.isFollowing} size="sm" />
      )}
    </article>
  );
}
