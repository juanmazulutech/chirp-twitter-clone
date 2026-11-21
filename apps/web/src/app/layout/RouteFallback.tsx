import { Spinner } from '@/components/ui/Spinner';

/** First load only: shown while the opening route's code arrives. */
export function RouteFallback() {
  return (
    <div className="grid min-h-dvh place-items-center text-ink-muted">
      <Spinner className="size-8" />
    </div>
  );
}
