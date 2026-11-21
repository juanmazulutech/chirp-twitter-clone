import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render';

describe('StyleguidePage', () => {
  it('is reachable in development and shows the Postmarked world', async () => {
    renderRoute('/styleguide');

    expect(
      await screen.findByRole('heading', { name: 'Postmarked', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Palette' })).toBeInTheDocument();
    expect(screen.getAllByText(/November 21, 2026/)).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'Components' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Chirp' }).length).toBeGreaterThan(0);
  });

  it('can render a single section for focused review', async () => {
    renderRoute('/styleguide?section=components');

    expect(await screen.findByRole('heading', { name: 'Components' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Palette' })).not.toBeInTheDocument();
  });

  it('opens a panel’s modal and shows toasts on request, for visual review', async () => {
    renderRoute('/styleguide?section=components&modal=night&toasts=1');

    expect(await screen.findByRole('dialog', { name: 'Delete chirp?' })).toBeInTheDocument();
    expect(await screen.findByText('Chirp posted')).toBeInTheDocument();
    expect(await screen.findByText('Could not delete the chirp')).toBeInTheDocument();
  });
});
