import type { UserProfile } from '@chirp/shared';
import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { formatMonthYear } from '@/lib/format';

import { FollowButton } from './FollowButton';

function countLabel(count: number, one: string, many: string) {
  return (
    <>
      <span className="font-semibold text-ink tabular-nums">{count.toLocaleString('en')}</span>{' '}
      {count === 1 ? one : many}
    </>
  );
}

/** Who the person is: picture, name, bio, when they joined and their follow counts. */
export function ProfileHeader({ profile }: { profile: UserProfile }) {
  const linkClasses = 'text-ink-muted underline-offset-2 hover:underline';

  return (
    <section
      aria-label="Profile"
      className="flex flex-col gap-3 border-b border-hairline px-4 py-4"
    >
      <div className="flex items-start justify-between gap-3">
        <Avatar name={profile.displayName} userId={profile.id} src={profile.avatarUrl} size="lg" />
        {/* Your own profile gets "Edit profile" here with the edit modal (C34). */}
        {profile.isMe ? null : (
          <FollowButton username={profile.username} isFollowing={profile.isFollowing} />
        )}
      </div>
      <div>
        <p className="text-lg leading-6 font-semibold text-ink">{profile.displayName}</p>
        <p className="text-sm text-ink-muted">@{profile.username}</p>
      </div>
      {profile.bio ? (
        <p className="max-w-[65ch] text-[0.9375rem] leading-5 wrap-anywhere whitespace-pre-wrap text-ink">
          {profile.bio}
        </p>
      ) : null}
      <p className="flex items-center gap-1.5 text-sm text-ink-muted">
        <CalendarDays aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Joined {formatMonthYear(new Date(profile.createdAt))}
      </p>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <Link to={`/${profile.username}/following`} className={linkClasses}>
          {countLabel(profile.followingCount, 'Following', 'Following')}
        </Link>
        <Link to={`/${profile.username}/followers`} className={linkClasses}>
          {countLabel(profile.followersCount, 'Follower', 'Followers')}
        </Link>
      </p>
    </section>
  );
}
