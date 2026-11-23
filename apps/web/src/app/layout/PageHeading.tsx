import type { ReactNode } from 'react';

interface PageHeadingProps {
  title: string;
  /** A control before the title, such as a back button; the heading itself stays text. */
  leading?: ReactNode;
}

/**
 * A route's heading. React 19 hoists the `<title>` into the document head, so every route
 * also names the browser tab.
 */
export function PageHeading({ title, leading }: PageHeadingProps) {
  return (
    <>
      <title>{`${title} · Chirp`}</title>
      {/* One shape with or without `leading`, so the heading is not remounted when it appears. */}
      <div
        className={`flex items-center gap-2 border-b border-hairline py-3 pr-4 ${leading ? 'pl-2' : 'pl-4'}`}
      >
        {leading}
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">{title}</h1>
      </div>
    </>
  );
}
