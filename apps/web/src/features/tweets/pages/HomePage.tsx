import { PagePlaceholder } from '@/app/layout/PagePlaceholder';

import { Composer } from '../components/Composer';

export function HomePage() {
  return (
    <PagePlaceholder
      title="Home"
      description="Chirps from the people you follow will appear here, newest first."
      toolbar={
        // Phones post from the floating compose button, so the timeline starts at the top.
        <div className="hidden border-b border-hairline px-4 py-3 sm:block">
          <Composer />
        </div>
      }
    />
  );
}
