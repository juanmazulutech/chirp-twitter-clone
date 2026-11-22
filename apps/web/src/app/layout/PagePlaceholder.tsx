import type { ReactNode } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';

import { PageHeading } from './PageHeading';

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

/** A route's heading and an empty state, until its feature lands. */
export function PagePlaceholder({
  title,
  heading = 'Nothing here yet',
  description,
  toolbar,
  children,
}: PagePlaceholderProps) {
  return (
    <>
      <PageHeading title={title} />
      {toolbar}
      <EmptyState title={heading} description={description}>
        {children}
      </EmptyState>
    </>
  );
}
