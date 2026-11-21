import { ButtonLink } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <section className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <title>Page not found · Chirp</title>
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">Page not found</h1>
      <p className="max-w-[40ch] text-ink-muted">
        This address doesn’t lead anywhere. It may have been mistyped, or the page was removed.
      </p>
      <ButtonLink to="/home" className="mt-2">
        Go to your timeline
      </ButtonLink>
    </section>
  );
}
