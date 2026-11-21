import { useSearchParams } from 'react-router';

import { PagePlaceholder } from '@/app/layout/PagePlaceholder';

import { SearchForm } from '../components/SearchForm';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';

  return (
    <PagePlaceholder
      title="Search"
      toolbar={
        // Desktop already has the search field in the side panel.
        <div className="border-b border-hairline px-4 py-3 lg:hidden">
          <SearchForm />
        </div>
      }
      description={
        query
          ? `People matching “${query}” will appear here.`
          : 'Find people by name or @username, then follow them to fill your timeline.'
      }
    />
  );
}
