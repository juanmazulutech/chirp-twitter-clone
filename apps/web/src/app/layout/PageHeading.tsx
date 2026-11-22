/**
 * A route's heading. React 19 hoists the `<title>` into the document head, so every route
 * also names the browser tab.
 */
export function PageHeading({ title }: { title: string }) {
  return (
    <>
      <title>{`${title} · Chirp`}</title>
      <h1 className="border-b border-hairline px-4 py-3 text-2xl font-bold tracking-[-0.02em] text-ink">
        {title}
      </h1>
    </>
  );
}
