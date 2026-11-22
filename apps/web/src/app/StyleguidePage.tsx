import type { Tweet } from '@chirp/shared';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Field,
  FieldError,
  FieldHint,
  FieldInput,
  FieldLabel,
  FieldTextarea,
} from '@/components/ui/Field';
import { Modal, ModalActions, ModalBody, ModalTitle } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { TweetCard } from '@/features/tweets/components/TweetCard';
import { notify } from '@/lib/notify';

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

const sampleChirps: Tweet[] = [
  {
    id: 'sample-ana',
    content:
      'Shipped keyboard focus styles for the whole design system today. Tab through it and tell me what breaks.',
    imageUrl: null,
    createdAt: '2026-11-21T21:42:00.000Z',
    author: { id: 'ana_codes', username: 'ana_codes', displayName: 'Ana Torres', avatarUrl: null },
    likeCount: 12,
    likedByMe: false,
  },
  {
    id: 'sample-kenji',
    content:
      "Day 3 of the new sourdough starter. It smells like green apples, which I'm choosing to take as a good sign.",
    imageUrl: null,
    createdAt: '2026-11-21T21:26:00.000Z',
    author: {
      id: 'kenji_cooks',
      username: 'kenji_cooks',
      displayName: 'Kenji Watanabe',
      avatarUrl: null,
    },
    likeCount: 27,
    likedByMe: false,
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
          <li key={chirp.id} className="border-b border-hairline last:border-b-0">
            <TweetCard tweet={chirp} />
          </li>
        ))}
      </ol>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <Button variant="primary">Chirp</Button>
        <a href="#signature" className="font-medium text-airmail-blue underline">
          A link in airmail blue
        </a>
      </div>
    </div>
  );
}

function ThemedComponents({
  name,
  className,
  initialModalOpen = false,
}: {
  name: string;
  className: string;
  initialModalOpen?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(initialModalOpen);

  return (
    <div
      className={`${className} flex flex-col gap-6 rounded-card border border-hairline bg-paper p-4 text-ink`}
    >
      <h3 className="text-sm font-semibold">{name}</h3>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary">Chirp</Button>
        <Button variant="secondary">Follow</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">Delete</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="sm">
          Chirp
        </Button>
        <Button variant="secondary" size="sm">
          Following
        </Button>
        <Button variant="primary" loading>
          Chirp
        </Button>
        <Button variant="secondary" disabled>
          Disabled
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Avatar name="Ana Torres" userId="ana" size="sm" />
        <Avatar name="Kenji Watanabe" userId="kenji" />
        <Avatar name="Amara Nwosu" userId="amara" size="lg" />
        <Spinner className="size-6 text-airmail-blue" />
      </div>

      <div className="flex flex-col gap-4 rounded-card border border-hairline bg-sheet p-4">
        <Field>
          <FieldLabel>Username</FieldLabel>
          <FieldInput defaultValue="ana_codes" />
          <FieldHint>3–15 letters, numbers or underscores.</FieldHint>
        </Field>
        <Field error="This email is already registered">
          <FieldLabel>Email</FieldLabel>
          <FieldInput type="email" defaultValue="ana@chirp.dev" />
          <FieldError />
        </Field>
        <Field>
          <FieldLabel>Bio</FieldLabel>
          <FieldTextarea
            maxCharacters={160}
            defaultValue="Frontend dev · TypeScript & accessibility nerd"
          />
        </Field>
      </div>

      <div className="rounded-card border border-hairline bg-sheet">
        <EmptyState title="Nothing here yet" description="Follow someone to fill your timeline.">
          <Button variant="secondary" size="sm">
            Find people
          </Button>
        </EmptyState>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Button onClick={() => notify.success('Chirp posted')}>Success toast</Button>
        <Button onClick={() => notify.error('Could not delete the chirp')}>Error toast</Button>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalTitle>Delete chirp?</ModalTitle>
        <ModalBody>It will disappear from your profile and everyone’s timeline.</ModalBody>
        <ModalActions>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => setModalOpen(false)}>
            Delete
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}

/**
 * Review helpers: `?section=components` renders one section alone, `?modal=day|night`
 * opens that panel's modal and `?toasts=1` shows a success and an error toast.
 */
export function StyleguidePage() {
  const [searchParams] = useSearchParams();
  const only = searchParams.get('section');
  const show = (section: string) => only === null || only === section;
  const openModalIn = searchParams.get('modal');
  const showToasts = searchParams.get('toasts') === '1';

  useEffect(() => {
    if (!showToasts) return;
    notify.success('Chirp posted');
    notify.error('Could not delete the chirp');
  }, [showToasts]);

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

        {show('signature') ? (
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
        ) : null}

        {show('components') ? (
          <section aria-labelledby="components" className="flex flex-col gap-4">
            <h2 id="components" className="text-lg font-semibold">
              Components
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {themes.map((theme) => (
                <ThemedComponents
                  key={theme.name}
                  {...theme}
                  initialModalOpen={openModalIn === theme.name.toLowerCase()}
                />
              ))}
            </div>
          </section>
        ) : null}

        {show('palette') ? (
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
        ) : null}

        {show('type') ? (
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
        ) : null}
      </main>
    </div>
  );
}
