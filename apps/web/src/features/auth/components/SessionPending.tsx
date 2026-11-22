import { Spinner } from '@/components/ui/Spinner';

/** Shown while the guards wait for the session: on the first load, or while leaving a page. */
export function SessionPending() {
  return (
    <div className="grid min-h-dvh place-items-center text-ink-muted">
      <Spinner className="size-8" />
    </div>
  );
}
