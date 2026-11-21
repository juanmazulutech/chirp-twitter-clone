import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Keeps the page's heading order; defaults to a section heading. */
  headingLevel?: 2 | 3;
  /** Optional call to action, e.g. a ButtonLink to search. */
  children?: ReactNode;
}

/** What a list shows when there is nothing in it yet, and what to do about it. */
export function EmptyState({ title, description, headingLevel = 2, children }: EmptyStateProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <section className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <Heading className="text-lg font-semibold text-ink">{title}</Heading>
      {description ? <p className="max-w-[40ch] text-ink-muted">{description}</p> : null}
      {children ? <div className="mt-2">{children}</div> : null}
    </section>
  );
}
