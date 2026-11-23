import { CircleAlert } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useParams } from 'react-router';

import { PageHeading } from '@/app/layout/PageHeading';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { NavTab, NavTabs } from '@/components/ui/NavTabs';
import { Spinner } from '@/components/ui/Spinner';
import { TweetList } from '@/features/tweets/components/TweetList';
import { isApiError } from '@/lib/api-client';

import { ProfileHeader } from '../components/ProfileHeader';
import { useProfile, useUserReplies, useUserTweets } from '../hooks';

type ProfileList = 'chirps' | 'replies';

function emptyCopy(list: ProfileList, username: string, isMe: boolean) {
  if (list === 'chirps') {
    return {
      title: 'No chirps yet',
      description: isMe
        ? 'What you post will appear here.'
        : `When @${username} posts, it will appear here.`,
    };
  }
  return {
    title: 'No replies yet',
    description: isMe
      ? 'When you reply to a chirp, your reply will appear here.'
      : `When @${username} replies to a chirp, it will appear here.`,
  };
}

interface ProfileViewProps {
  username: string;
  list: ProfileList;
  /** The list under the header, started by the page so it loads alongside the profile. */
  query: ComponentProps<typeof TweetList>['query'];
}

function ProfileView({ username, list, query }: ProfileViewProps) {
  const profile = useProfile(username);

  if (profile.data) {
    const { displayName } = profile.data;
    const empty = emptyCopy(list, profile.data.username, profile.data.isMe);
    const heading = list === 'chirps' ? 'Chirps' : 'Replies';
    return (
      <>
        <PageHeading title={displayName} />
        <ProfileHeader profile={profile.data} />
        <NavTabs label="Chirps and replies">
          <NavTab to={`/${profile.data.username}`}>Chirps</NavTab>
          <NavTab to={`/${profile.data.username}/replies`}>Replies</NavTab>
        </NavTabs>
        <h2 className="sr-only">{heading}</h2>
        <TweetList
          query={query}
          label={`${heading} by ${displayName}`}
          empty={<EmptyState title={empty.title} description={empty.description} />}
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

function useProfileUsername() {
  return (useParams().username ?? '').toLowerCase();
}

export function ProfilePage() {
  const username = useProfileUsername();
  const chirps = useUserTweets(username);
  return <ProfileView username={username} list="chirps" query={chirps} />;
}

export function ProfileRepliesPage() {
  const username = useProfileUsername();
  const replies = useUserReplies(username);
  return <ProfileView username={username} list="replies" query={replies} />;
}
