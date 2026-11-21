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
  });
});
