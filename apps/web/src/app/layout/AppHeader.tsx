import { Link } from 'react-router';

/** The sheet header with the wordmark, and beneath it the page's one airmail chevron. */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 bg-sheet">
      <div className="flex h-14 items-center px-4">
        <Link
          to="/home"
          className="rounded-sm text-xl font-bold tracking-[-0.02em] text-ink no-underline"
        >
          Chirp
        </Link>
      </div>
      <div className="airmail-edge" />
    </header>
  );
}
