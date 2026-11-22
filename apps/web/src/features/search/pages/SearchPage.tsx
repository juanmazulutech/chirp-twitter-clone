import { useSearchParams } from 'react-router';

import { PageHeading } from '@/app/layout/PageHeading';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfiniteList } from '@/components/ui/InfiniteList';
import { UserRow } from '@/features/profile/components/UserRow';

import { SearchForm } from '../components/SearchForm';
import { cleanSearchTerm, useUserSearch } from '../hooks';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const term = cleanSearchTerm(searchParams.get('q') ?? '');
  const results = useUserSearch(term);

  return (
    <>
      <PageHeading title="Search" />
      {/* Desktop already has the search field in the side panel. */}
      <div className="border-b border-hairline px-4 py-3 lg:hidden">
        <SearchForm />
      </div>
      {term === null ? (
        <EmptyState
          title="Find people to follow"
          description="Search by name or @username, then follow people to fill your timeline."
        />
      ) : (
        <>
          <h2 className="sr-only">People matching “{term}”</h2>
          <InfiniteList
            query={results}
            label={`People matching “${term}”`}
            noun="people"
            getKey={(user) => user.id}
            renderItem={(user) => <UserRow user={user} />}
            empty={
              <EmptyState
                title={`No one matches “${term}”`}
                description="Check the spelling, or try part of a name or @username."
              />
            }
            endMessage="That’s everyone."
          />
        </>
      )}
    </>
  );
}
