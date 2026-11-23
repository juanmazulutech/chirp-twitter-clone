import type { UseQueryResult } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { Navigate, useParams } from 'react-router';

import { PageHeading } from '@/app/layout/PageHeading';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { isApiError } from '@/lib/api-client';

import { FocusedTweet } from '../components/FocusedTweet';
import { ThreadAncestors } from '../components/ThreadAncestors';
import { TweetList } from '../components/TweetList';
import { useAncestors, useReplies, useTweet } from '../hooks';
import { tweetPath } from '../tweet-path';

const TITLE = 'Conversation';

/** A failed request with a way to try again; `what` names what did not load. */
function LoadFailure({ what, query }: { what: string; query: UseQueryResult }) {
  return (
    <section role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <CircleAlert aria-hidden="true" className="size-8 text-danger" strokeWidth={1.75} />
      <h2 className="text-lg font-semibold text-ink">{what} didn’t load</h2>
      <p className="max-w-[40ch] text-ink-muted">Check your connection and try again.</p>
      <Button
        className="mt-2"
        loading={query.isFetching}
        onClick={() => {
          void query.refetch();
        }}
      >
        Try again
      </Button>
    </section>
  );
}

/**
 * A chirp's own page: the conversation above it, the chirp itself, and its replies below.
 * All three requests start at once, so nothing waits for the chirp to arrive first.
 */
export function TweetPage() {
  const params = useParams();
  const tweetId = params.tweetId ?? '';
  const username = (params.username ?? '').toLowerCase();
  const tweet = useTweet(tweetId);
  const ancestors = useAncestors(tweetId);
  const replies = useReplies(tweetId);

  if (tweet.data) {
    // The address names the author, but the id decides: a wrong or old name is corrected.
    if (tweet.data.author.username !== username) {
      return <Navigate to={tweetPath(tweet.data)} replace />;
    }
    const { displayName, username: handle } = tweet.data.author;
    return (
      <>
        <PageHeading title={TITLE} />
        {tweet.data.replyTo ? (
          ancestors.data ? (
            <ThreadAncestors ancestors={ancestors.data.items} />
          ) : ancestors.isError ? (
            <LoadFailure what="The rest of the conversation" query={ancestors} />
          ) : (
            <div className="grid place-items-center px-4 py-4 text-ink-muted">
              <Spinner label="Loading the conversation" className="size-5" />
            </div>
          )
        ) : null}
        <FocusedTweet tweet={tweet.data} />
        <h2 className="sr-only">Replies</h2>
        <TweetList
          query={replies}
          label={`Replies to ${displayName}`}
          empty={
            <EmptyState
              title="No replies yet"
              description={`When someone answers @${handle}, it will appear here.`}
            />
          }
        />
      </>
    );
  }

  if (isApiError(tweet.error, 404)) {
    return (
      <>
        <PageHeading title="Chirp not found" />
        <EmptyState
          title="This chirp doesn’t exist"
          description="It may have been deleted, along with the conversation under it."
        >
          <ButtonLink to="/home">Back to home</ButtonLink>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeading title={TITLE} />
      {tweet.isError ? (
        <LoadFailure what="This chirp" query={tweet} />
      ) : (
        <div className="grid place-items-center px-4 py-12 text-ink-muted">
          <Spinner label="Loading chirp" className="size-6" />
        </div>
      )}
    </>
  );
}
