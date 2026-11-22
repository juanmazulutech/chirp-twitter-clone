import { PageHeading } from '@/app/layout/PageHeading';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

import { Composer } from '../components/Composer';
import { TweetList } from '../components/TweetList';
import { useTimeline } from '../hooks';

// A new account follows nobody yet, so its timeline starts here.
const emptyTimeline = (
  <EmptyState
    title="Your timeline is quiet"
    description="Follow people to see their chirps here, newest first."
  >
    <ButtonLink to="/search">Find people to follow</ButtonLink>
  </EmptyState>
);

export function HomePage() {
  const timeline = useTimeline();

  return (
    <>
      <PageHeading title="Home" />
      {/* Phones post from the floating compose button, so the timeline starts at the top. */}
      <div className="hidden border-b border-hairline px-4 py-3 sm:block">
        <Composer />
      </div>
      <TweetList query={timeline} label="Home timeline" empty={emptyTimeline} />
    </>
  );
}
