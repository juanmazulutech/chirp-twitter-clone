import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it, vi } from 'vitest';

import { Button, ButtonLink } from './Button';
import { buttonClasses } from './button-classes';

describe('Button', () => {
  it('is a plain button by default, so it never submits a form by accident', () => {
    render(<Button>Follow</Button>);

    expect(screen.getByRole('button', { name: 'Follow' })).toHaveAttribute('type', 'button');
  });

  it('runs its action when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Follow</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Follow' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is busy and inert while loading, keeping its label for assistive tech', async () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" loading onClick={onClick}>
        Chirp
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Chirp' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('stays inert while loading even if a caller passes disabled={false}', () => {
    render(
      <Button loading disabled={false}>
        Chirp
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Chirp' })).toBeDisabled();
  });

  it('can be disabled without loading', () => {
    render(<Button disabled>Chirp</Button>);

    const button = screen.getByRole('button', { name: 'Chirp' });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');
  });
});

describe('buttonClasses', () => {
  it.each([
    ['primary', 'bg-airmail-red'],
    ['secondary', 'border-hairline'],
    ['ghost', 'text-ink-muted'],
    ['danger', 'border-danger'],
  ] as const)('styles the %s variant', (variant, className) => {
    expect(buttonClasses({ variant })).toContain(className);
  });

  it('defaults to a medium secondary button and keeps extra classes', () => {
    const classes = buttonClasses({ className: 'w-full' });
    expect(classes).toContain('h-11');
    expect(classes).toContain('border-hairline');
    expect(classes).toContain('w-full');
  });

  it('keeps a busy button at full colour while still fading disabled ones', () => {
    const classes = buttonClasses();
    expect(classes).toContain('[&:disabled:not([aria-busy])]:opacity-50');
    expect(classes).toContain('aria-busy:cursor-wait');
  });

  it('outlines the danger variant so it never reads as the primary action', () => {
    expect(buttonClasses({ variant: 'danger' })).toContain('text-danger');
    expect(buttonClasses({ variant: 'danger' })).not.toContain('bg-airmail-red');
  });

  it('has a small size', () => {
    expect(buttonClasses({ size: 'sm' })).toContain('h-9');
  });
});

describe('ButtonLink', () => {
  it('navigates like a link while looking like a button', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <ButtonLink to="/register" variant="primary">
              Sign up
            </ButtonLink>
          ),
        },
        { path: '/register', element: <h1>Create your account</h1> },
      ],
      { initialEntries: ['/'] },
    );
    render(<RouterProvider router={router} />);

    const link = screen.getByRole('link', { name: 'Sign up' });
    expect(link).toHaveClass('bg-airmail-red');
    await userEvent.click(link);

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
  });
});
