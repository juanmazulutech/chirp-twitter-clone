import { Postmark } from '@/components/ui/Postmark';

// Development-only reference of the Postmarked world: the tokens, type and signature
// move as they render. Used for visual review; never shipped in production builds.

const swatches = [
  { token: 'paper', role: 'Page ground', className: 'bg-paper' },
  { token: 'sheet', role: 'Raised surfaces', className: 'bg-sheet' },
  { token: 'ink', role: 'Body text', className: 'bg-ink' },
  { token: 'ink-muted', role: 'Secondary text', className: 'bg-ink-muted' },
  { token: 'hairline', role: 'Dividers', className: 'bg-hairline' },
  { token: 'airmail-red', role: 'Primary action, liked', className: 'bg-airmail-red' },
  { token: 'airmail-blue', role: 'Links, selection, focus', className: 'bg-airmail-blue' },
  { token: 'danger', role: 'Destructive, errors', className: 'bg-danger' },
];

const typeScale = [
  { name: 'Page title', className: 'text-2xl font-bold tracking-[-0.02em]' },
  { name: 'Section', className: 'text-lg font-semibold' },
  { name: 'Chirp body', className: 'text-[0.9375rem] leading-5' },
  { name: 'Meta', className: 'text-sm text-ink-muted' },
  { name: 'Caption', className: 'text-xs text-ink-muted' },
];

const sampleChirps = [
  {
    initials: 'AT',
    name: 'Ana Torres',
    handle: 'ana_codes',
    color: 'bg-avatar-1',
    text: 'Shipped keyboard focus styles for the whole design system today. Tab through it and tell me what breaks.',
    sentAt: '2026-11-21T21:42:00.000Z',
    likes: 12,
  },
  {
    initials: 'KW',
    name: 'Kenji Watanabe',
    handle: 'kenji_cooks',
    color: 'bg-avatar-2',
    text: "Day 3 of the new sourdough starter. It smells like green apples, which I'm choosing to take as a good sign.",
    sentAt: '2026-11-21T21:26:00.000Z',
    likes: 27,
  },
];

const themes = [
  { name: 'Day', className: 'theme-light' },
  { name: 'Night', className: 'theme-dark' },
];

function ThemedPalette({ name, className }: { name: string; className: string }) {
  return (
    <div
      className={`${className} flex flex-col gap-3 rounded-card border border-hairline bg-paper p-4 text-ink`}
    >
      <h3 className="text-sm font-semibold">{name}</h3>
      <ul className="grid grid-cols-2 gap-3">
        {swatches.map((swatch) => (
          <li key={swatch.token} className="flex flex-col gap-1">
            <span className={`h-10 rounded-lg border border-hairline ${swatch.className}`} />
            <span className="text-sm font-semibold">{swatch.token}</span>
            <span className="text-xs text-ink-muted">{swatch.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ThemedChirps({ name, className }: { name: string; className: string }) {
  return (
    <div
      className={`${className} flex flex-col gap-2 overflow-hidden rounded-card border border-hairline bg-paper p-4 text-ink`}
    >
      <h3 className="text-sm font-semibold">{name}</h3>
      <ol className="bg-sheet">
        {sampleChirps.map((chirp) => (
          <li
            key={chirp.handle}
            className="relative grid grid-cols-[2.75rem_1fr] gap-3 border-b border-hairline px-4 py-3 last:border-b-0"
          >
            <span
              aria-hidden="true"
              className={`grid size-11 place-content-center rounded-full font-semibold text-white ${chirp.color}`}
            >
              {chirp.initials}
            </span>
            <div className="pr-16">
              <p className="text-sm">
                <span className="font-semibold">{chirp.name}</span>{' '}
                <span className="text-ink-muted">@{chirp.handle}</span>
              </p>
              <p className="mt-1 text-[0.9375rem] leading-5">{chirp.text}</p>
              <p className="mt-2 text-sm text-ink-muted tabular-nums">{chirp.likes} likes</p>
            </div>
            <Postmark dateTime={chirp.sentAt} className="absolute top-2.5 right-3.5" />
          </li>
        ))}
      </ol>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <span className="inline-flex h-12 items-center rounded-full bg-airmail-red px-5 font-semibold text-on-airmail-red">
          Chirp
        </span>
        <a href="#signature" className="font-medium text-airmail-blue underline">
          A link in airmail blue
        </a>
      </div>
    </div>
  );
}

export function StyleguidePage() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="bg-sheet">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <span className="text-xl font-bold tracking-[-0.02em]">Chirp</span>
        </div>
        <div className="airmail-edge" />
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8">
        <section className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Postmarked</h1>
          <p className="max-w-[65ch] text-ink-muted">
            Every chirp is a letter from someone you chose, stamped with the moment it was sent.
            Airmail paper and navy ink by day, a navy envelope by night.
          </p>
        </section>

        <section aria-labelledby="signature" className="flex flex-col gap-4">
          <h2 id="signature" className="text-lg font-semibold">
            Signature: the postmark
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {themes.map((theme) => (
              <ThemedChirps key={theme.name} {...theme} />
            ))}
          </div>
        </section>

        <section aria-labelledby="palette" className="flex flex-col gap-4">
          <h2 id="palette" className="text-lg font-semibold">
            Palette
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {themes.map((theme) => (
              <ThemedPalette key={theme.name} {...theme} />
            ))}
          </div>
        </section>

        <section aria-labelledby="type" className="flex flex-col gap-4">
          <h2 id="type" className="text-lg font-semibold">
            Type
          </h2>
          <ul className="flex flex-col gap-3">
            {typeScale.map((style) => (
              <li key={style.name} className={`tabular-nums ${style.className}`}>
                {style.name} · Archivo, tabular 0123456789
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
