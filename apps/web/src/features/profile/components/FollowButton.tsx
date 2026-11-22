import { UserCheck, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/Button';

import { useFollowUser } from '../hooks';

interface FollowButtonProps {
  /** Lowercase, as in the profile's cache key. */
  username: string;
  isFollowing: boolean;
  size?: 'md' | 'sm';
}

/**
 * Follows or unfollows at once, rolling back if the server refuses. The state is in the label,
 * the icon and `aria-pressed`, never in colour alone.
 */
export function FollowButton({ username, isFollowing, size = 'md' }: FollowButtonProps) {
  const follow = useFollowUser(username);
  const Icon = isFollowing ? UserCheck : UserPlus;

  return (
    <Button
      size={size}
      aria-pressed={isFollowing}
      onClick={() => {
        follow.mutate(!isFollowing);
      }}
    >
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
