import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { useSession } from '@/features/auth/hooks';

import { HeaderSignOutButton } from './SignOutButton';

/**
 * The sheet header with the wordmark, and beneath it the page's one airmail chevron.
 * On phones it also carries your avatar, the way to your profile, and the sign-out button;
 * larger screens reach both from the rail.
 */
export function AppHeader() {
  const { user } = useSession();

  return (
    <header className="sticky top-0 z-20 bg-sheet">
      <div className="flex h-14 items-center gap-3 px-4">
        {user ? (
          <Link
            to={`/${user.username}`}
            aria-label="Your profile"
            className="rounded-full sm:hidden"
          >
            <Avatar name={user.displayName} userId={user.id} src={user.avatarUrl} size="sm" />
          </Link>
        ) : null}
        <Link
          to="/home"
          className="rounded-sm text-xl font-bold tracking-[-0.02em] text-ink no-underline"
        >
          Chirp
        </Link>
        <HeaderSignOutButton />
      </div>
      <div className="airmail-edge" />
    </header>
  );
}
