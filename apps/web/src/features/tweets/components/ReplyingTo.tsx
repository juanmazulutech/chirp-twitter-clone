import { Link } from 'react-router';

/** "Replying to @ana": which conversation a reply belongs to, linking to who it answers. */
export function ReplyingTo({ username }: { username: string }) {
  return (
    <p className="truncate text-sm text-ink-muted">
      Replying to{' '}
      {/* Underlined at rest: beside faded text, blue alone does not mark a link (WCAG 1.4.1). */}
      <Link to={`/${username}`} className="font-medium text-airmail-blue underline">
        @{username}
      </Link>
    </p>
  );
}
