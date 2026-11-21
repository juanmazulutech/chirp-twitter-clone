import type { ReactNode } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';

interface PagePlaceholderProps {
  /** The page heading, also used for the document title. */
  title: string;
  /** The empty state's heading. */
  heading?: string;
  /** What will live here, in the product's own words. */
  description: string;
  /** Controls that belong under the heading, such as the phone search field. */
  toolbar?: ReactNode;
  children?: ReactNode;
}

/**
 * A route's heading and an empty state, until its feature lands. React 19 hoists the
 * `<title>` into the document head, so every route names the browser tab.
 */
export function PagePlaceholder({
  title,
  heading = 'Nothing here yet',
  description,
  toolbar,
  children,
}: PagePlaceholderProps) {
  return (
    <>
      <title>{`${title} · Chirp`}</title>
      <h1 className="border-b border-hairline px-4 py-3 text-2xl font-bold tracking-[-0.02em] text-ink">
        {title}
      </h1>
      {toolbar}
      <EmptyState title={heading} description={description}>
        {children}
      </EmptyState>
    </>
  );
}
