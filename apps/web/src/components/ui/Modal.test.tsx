import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';
import { Modal, ModalActions, ModalBody, ModalTitle } from './Modal';

function DeleteFlow({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    onClose();
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>Delete</Button>
      <Modal open={open} onClose={close}>
        <ModalTitle>Delete chirp?</ModalTitle>
        <ModalBody>This can’t be undone.</ModalBody>
        <ModalActions>
          <Button onClick={close}>Cancel</Button>
        </ModalActions>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('opens as a dialog named by its title', async () => {
    render(<DeleteFlow />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = screen.getByRole('dialog', { name: 'Delete chirp?' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByText('This can’t be undone.')).toBeVisible();
  });

  it('closes from its close button', async () => {
    const onClose = vi.fn();
    render(<DeleteFlow onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when the browser closes the dialog (Escape)', async () => {
    const onClose = vi.fn();
    render(<DeleteFlow onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    fireEvent(screen.getByRole('dialog'), new Event('close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('closes on a backdrop click but not on a click inside the content', async () => {
    const onClose = vi.fn();
    render(<DeleteFlow onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await userEvent.click(screen.getByText('This can’t be undone.'));
    expect(onClose).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog');
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalled();
  });

  it('stays open when a drag starts inside and ends on the backdrop (text selection)', async () => {
    const onClose = vi.fn();
    render(<DeleteFlow onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    fireEvent.pointerDown(screen.getByText('This can’t be undone.'));
    fireEvent.click(screen.getByRole('dialog'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks page scrolling while open and restores it afterwards', async () => {
    render(<DeleteFlow />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(document.documentElement.style.overflow).toBe('hidden');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('requires a Modal around its title', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ModalTitle>Orphan</ModalTitle>)).toThrow(
      '<ModalTitle> must be rendered inside <Modal>',
    );
  });
});
