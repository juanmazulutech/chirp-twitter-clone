import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render';

import { APPEARANCE_STORAGE_KEY } from '../appearance';

const root = document.documentElement;

/** jsdom applies no CSS, so the rail's and the header's buttons are both present. */
async function openAppearance() {
  renderRoute('/home');
  await screen.findByRole('heading', { level: 1, name: 'Home' });
  const [button] = screen.getAllByRole('button', { name: 'Appearance' });
  if (!button) throw new Error('No Appearance button');
  await userEvent.click(button);
  return screen.getByRole('dialog', { name: 'Appearance' });
}

describe('AppearanceModal', () => {
  it('offers the rail and the phone header a way in', async () => {
    renderRoute('/home');
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    expect(screen.getAllByRole('button', { name: 'Appearance' })).toHaveLength(2);
  });

  it('follows the system until the viewer chooses', async () => {
    const dialog = await openAppearance();

    const system = within(dialog).getByRole('radio', { name: /^System/ });
    expect(system).toBeChecked();
    expect(system).toHaveFocus();
    expect(root.style.colorScheme).toBe('');
  });

  it('applies a choice at once and remembers it on this device', async () => {
    const dialog = await openAppearance();

    await userEvent.click(within(dialog).getByRole('radio', { name: /^Dark/ }));

    expect(root.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe('dark');
    expect(within(dialog).getByRole('radio', { name: /^Dark/ })).toBeChecked();
  });

  it('shows the saved choice when opened again, and Done closes it', async () => {
    const dialog = await openAppearance();
    await userEvent.click(within(dialog).getByRole('radio', { name: /^Light/ }));

    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog', { name: 'Appearance' })).not.toBeInTheDocument();

    const [button] = screen.getAllByRole('button', { name: 'Appearance' });
    if (!button) throw new Error('No Appearance button');
    await userEvent.click(button);
    expect(
      within(screen.getByRole('dialog', { name: 'Appearance' })).getByRole('radio', {
        name: /^Light/,
      }),
    ).toBeChecked();
  });

  it('goes back to the system theme and forgets the choice', async () => {
    const dialog = await openAppearance();
    await userEvent.click(within(dialog).getByRole('radio', { name: /^Dark/ }));

    await userEvent.click(within(dialog).getByRole('radio', { name: /^System/ }));

    expect(root.style.colorScheme).toBe('');
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBeNull();
  });

  it('moves between choices with the arrow keys, like any radio group', async () => {
    const dialog = await openAppearance();
    within(dialog)
      .getByRole('radio', { name: /^System/ })
      .focus();

    await userEvent.keyboard('{ArrowDown}');

    expect(within(dialog).getByRole('radio', { name: /^Light/ })).toBeChecked();
    expect(root.style.colorScheme).toBe('light');
  });
});
