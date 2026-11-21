import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Postmark } from './Postmark';

describe('Postmark', () => {
  it('renders a machine-readable time with a full spoken label', () => {
    render(<Postmark dateTime="2026-11-21T21:42:00.000Z" />);

    const label = screen.getByText(/November 21, 2026/);
    expect(label).toHaveClass('sr-only');
    const time = label.closest('time');
    expect(time).toHaveAttribute('datetime', '2026-11-21T21:42:00.000Z');
  });

  it('stamps the day, the time and the mark', () => {
    render(<Postmark dateTime="2026-11-21T12:05:00.000Z" />);

    const time = screen.getByText(/November 21, 2026/).closest('time');
    expect(time).toHaveTextContent(/21 NOV/);
    expect(time).toHaveTextContent(/\d{2}:05/);
    expect(time).toHaveTextContent('CHIRP');
  });
});
