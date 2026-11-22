import { CircleAlert } from 'lucide-react';
import { useParams } from 'react-router';

import { PageHeading } from '@/app/layout/PageHeading';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { TweetList } from '@/features/tweets/components/TweetList';
import { isApiError } from '@/lib/api-client';

import { ProfileHeader } from '../components/ProfileHeader';
import { useProfile, useUserTweets } from '../hooks';

export function ProfilePage() {
  const username = (useParams().username ?? '').toLowerCase();
  // Both start at once: the chirps do not wait for the header.
  const profile = useProfile(username);
  const tweets = useUserTweets(username);

  if (profile.data) {
    const { displayName } = profile.data;
    return (
      <>
        <PageHeading title={displayName} />
        <ProfileHeader profile={profile.data} />
        <h2 className="sr-only">Chirps</h2>
        <TweetList
          query={tweets}
          label={`Chirps by ${displayName}`}
          empty={
            <EmptyState
              title="No chirps yet"
              description={
                profile.data.isMe
                  ? 'What you post will appear here.'
                  : `When @${profile.data.username} posts, it will appear here.`
              }
            />
          }
        />
      </>
    );
  }

  if (isApiError(profile.error, 404)) {
    return (
      <>
        <PageHeading title="Account not found" />
        <EmptyState
          title="This account doesn’t exist"
          description={`Nobody is called @${username}. Check the spelling or search for them.`}
        >
          <ButtonLink to="/search">Search people</ButtonLink>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeading title={`@${username}`} />
      {profile.isError ? (
        <section role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <CircleAlert aria-hidden="true" className="size-8 text-danger" strokeWidth={1.75} />
          <h2 className="text-lg font-semibold text-ink">This profile didn’t load</h2>
          <p className="max-w-[40ch] text-ink-muted">Check your connection and try again.</p>
          <Button
            className="mt-2"
            loading={profile.isFetching}
            onClick={() => {
              void profile.refetch();
            }}
          >
            Try again
          </Button>
        </section>
      ) : (
        <div className="grid place-items-center px-4 py-12 text-ink-muted">
          <Spinner label="Loading profile" className="size-6" />
        </div>
      )}
    </>
  );
}
