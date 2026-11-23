import { Link } from 'react-router';

/** "Replying to @ana": which conversation a reply belongs to, linking to who it answers. */
export function ReplyingTo({ username }: { username: string }) {
  return (
    <p className="truncate text-sm text-ink-muted">
      Replying to{' '}
      <Link to={`/${username}`} className="text-airmail-blue underline-offset-2 hover:underline">
        @{username}
      </Link>
    </p>
  );
}
