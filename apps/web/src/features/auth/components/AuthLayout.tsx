import type { ReactNode } from 'react';

interface AuthLayoutProps {
  /** The page heading, also used for the document title. */
  title: string;
  /** The way to the other screen ("New to Chirp? Create an account"). */
  footer: ReactNode;
  children: ReactNode;
}

/**
 * The signed-out frame: the same sheet header, wordmark and single chevron as the app, then
 * one column of form. Full-bleed sheet on phones; a bordered sheet on the paper from 640px.
 */
export function AuthLayout({ title, footer, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <title>{`${title} · Chirp`}</title>
      <header className="bg-sheet">
        <div className="mx-auto flex h-14 max-w-md items-center px-4 sm:px-8">
          <span className="text-xl font-bold tracking-[-0.02em] text-ink">Chirp</span>
        </div>
        <div className="airmail-edge" />
      </header>
      <main
        id="main"
        className="flex w-full flex-1 flex-col gap-6 bg-sheet px-4 py-8 sm:mx-auto sm:my-12 sm:max-w-md sm:flex-none sm:rounded-card sm:border sm:border-hairline sm:px-8"
      >
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">{title}</h1>
        {children}
        <p className="border-t border-hairline pt-6 text-sm text-ink-muted">{footer}</p>
      </main>
    </div>
  );
}
