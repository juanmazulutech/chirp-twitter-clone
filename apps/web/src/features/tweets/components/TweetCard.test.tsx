import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { tweetFixture } from '@/test/fixtures';

import { TweetCard } from './TweetCard';

function renderCard(...overrides: Parameters<typeof tweetFixture>) {
  const tweet = tweetFixture(...overrides);
  const router = createMemoryRouter([{ path: '/', element: <TweetCard tweet={tweet} /> }]);
  render(<RouterProvider router={router} />);
  return { tweet, card: screen.getByRole('article', { name: 'Chirp by Ana Torres' }) };
}

describe('TweetCard', () => {
  it('names the author, linking to their profile, next to their handle', () => {
    const { card } = renderCard();

    expect(within(card).getByRole('link', { name: 'Ana Torres' })).toHaveAttribute(
      'href',
      '/ana_codes',
    );
    expect(within(card).getByText('@ana_codes')).toBeInTheDocument();
  });

  it('shows the text exactly as the author wrote it, line breaks included', () => {
    const { card } = renderCard({ content: 'First line\nSecond line' });

    expect(card.textContent).toContain('First line\nSecond line');
  });

  it('stamps the chirp with the full date for assistive technology', () => {
    const { card, tweet } = renderCard({ createdAt: '2026-11-21T10:00:00.000Z' });

    const postmark = within(card)
      .getByText(/November 21, 2026/)
      .closest('time');
    expect(postmark).toHaveAttribute('datetime', tweet.createdAt);
  });

  it.each([
    [0, '0 likes'],
    [1, '1 like'],
    [1234, '1,234 likes'],
  ])('counts %i like(s) as "%s"', (likeCount, label) => {
    const { card } = renderCard({ likeCount });

    expect(within(card).getByText(label)).toBeInTheDocument();
  });
});
