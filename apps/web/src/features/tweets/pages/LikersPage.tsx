import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { PageHeading } from '@/app/layout/PageHeading';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfiniteList } from '@/components/ui/InfiniteList';
import { UserRow } from '@/features/profile/components/UserRow';
import { isApiError } from '@/lib/api-client';

import { useLikers } from '../hooks';

/**
 * The people who liked a chirp, most recent like first, each with a follow button. Back
 * returns where the reader came from, or to the chirp itself on a direct visit.
 */
export function LikersPage() {
  const { username = '', tweetId = '' } = useParams();
  const likers = useLikers(tweetId);
  const navigate = useNavigate();
  const location = useLocation();
  const chirpPath = `/${username}/status/${tweetId}`;

  const back = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Back"
      onClick={() => {
        if (location.key !== 'default') void navigate(-1);
        else void navigate(chirpPath);
      }}
    >
      <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={1.75} />
    </Button>
  );

  return (
    <>
      <PageHeading title="Liked by" leading={back} />
      {isApiError(likers.error, 404) ? (
        <EmptyState
          title="This chirp doesn’t exist"
          description="It may have been deleted, or the link is wrong."
        />
      ) : (
        <InfiniteList
          query={likers}
          label="People who liked this chirp"
          noun="people"
          getKey={(user) => user.id}
          renderItem={(user) => <UserRow user={user} />}
          empty={
            <EmptyState
              title="No likes yet"
              description="When someone likes this chirp, they’ll appear here."
            />
          }
          endMessage="That’s everyone."
        />
      )}
    </>
  );
}
