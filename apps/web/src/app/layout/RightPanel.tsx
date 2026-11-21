import { SearchForm } from '@/features/search/components/SearchForm';

/** Desktop only: people search beside the feed. "Who to follow" joins when its data exists. */
export function RightPanel() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 px-6 pt-16 lg:block">
      <div className="rounded-card border border-hairline bg-sheet p-4">
        <SearchForm />
      </div>
    </aside>
  );
}
