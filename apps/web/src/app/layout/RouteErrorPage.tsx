import { CircleAlert } from 'lucide-react';

import { Button } from '@/components/ui/Button';

/**
 * Shown when a route fails to render or its code fails to load (often a new deployment
 * replaced the chunk the open tab expected); reloading fetches the current version.
 */
export function RouteErrorPage() {
  return (
    <section role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <title>Something went wrong · Chirp</title>
      <CircleAlert aria-hidden="true" className="size-8 text-danger" strokeWidth={1.75} />
      <h1 className="text-lg font-semibold text-ink">This page didn’t load</h1>
      <p className="max-w-[40ch] text-ink-muted">
        Check your connection and reload. If it keeps happening, try again in a minute.
      </p>
      <Button
        className="mt-2"
        onClick={() => {
          window.location.reload();
        }}
      >
        Reload
      </Button>
    </section>
  );
}
