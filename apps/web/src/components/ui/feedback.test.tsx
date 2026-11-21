import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { notify } from '@/lib/notify';

import { EmptyState } from './EmptyState';
import { Spinner } from './Spinner';
import { Toaster } from './Toaster';

describe('Spinner', () => {
  it('has an accessible name by default', () => {
    render(<Spinner />);

    expect(screen.getByRole('img', { name: 'Loading' })).toBeInTheDocument();
  });

  it('can be silent when a parent already announces the busy state', () => {
    const { container } = render(<Spinner label={null} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('stops turning under reduced motion', () => {
    const { container } = render(<Spinner />);

    expect(container.querySelector('svg')).toHaveClass('motion-reduce:animate-none');
  });
});

describe('EmptyState', () => {
  it('explains the empty list and offers what to do next', () => {
    render(
      <EmptyState title="Nothing here yet" description="Follow someone to fill your timeline.">
        <a href="/search">Find people</a>
      </EmptyState>,
    );

    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
    expect(screen.getByText('Follow someone to fill your timeline.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Find people' })).toBeInTheDocument();
  });

  it('can sit one heading level deeper to keep the page outline', () => {
    render(<EmptyState title="No replies" headingLevel={3} />);

    expect(screen.getByRole('heading', { name: 'No replies', level: 3 })).toBeInTheDocument();
  });

  it('works with a title alone', () => {
    render(<EmptyState title="No notifications" />);

    expect(screen.getByRole('heading', { name: 'No notifications' })).toBeInTheDocument();
  });
});

describe('notify', () => {
  it('shows success and error messages in the notifications region', async () => {
    render(<Toaster />);

    act(() => notify.success('Chirp posted'));
    act(() => notify.error('Could not delete the chirp'));

    expect(await screen.findByText('Chirp posted')).toBeInTheDocument();
    expect(await screen.findByText('Could not delete the chirp')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Notifications/ })).toBeInTheDocument();
  });
});
