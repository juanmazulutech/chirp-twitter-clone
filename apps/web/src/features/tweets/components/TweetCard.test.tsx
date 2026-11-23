import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { tweetFixture } from '@/test/fixtures';
import { renderRoute } from '@/test/render';

import { TweetCard } from './TweetCard';

function renderCard(...overrides: Parameters<typeof tweetFixture>) {
  const tweet = tweetFixture(...overrides);
  const { queryClient } = renderRoute('/', {
    routes: [{ path: '/', element: <TweetCard tweet={tweet} /> }],
  });
  const name = `Chirp by ${tweet.author.displayName}`;
  return { tweet, queryClient, card: screen.getByRole('article', { name }) };
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

  it('links the like count to the people who liked the chirp', () => {
    const { card, tweet } = renderCard({ likeCount: 2 });

    expect(within(card).getByRole('link', { name: '2 likes' })).toHaveAttribute(
      'href',
      `/ana_codes/status/${tweet.id}/likes`,
    );
  });

  it('leaves a count of zero as text: there is nobody to list', () => {
    const { card } = renderCard({ likeCount: 0 });

    expect(within(card).queryByRole('link', { name: '0 likes' })).not.toBeInTheDocument();
  });

  it('shows the like toggle, pressed when the viewer liked the chirp', () => {
    const { card } = renderCard({ likedByMe: true });

    expect(within(card).getByRole('button', { name: 'Like' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('offers to delete the viewer’s own chirp once the session is known', async () => {
    const { card } = renderCard();

    expect(await within(card).findByRole('button', { name: 'Delete chirp' })).toBeInTheDocument();
  });

  it('never offers to delete someone else’s chirp', async () => {
    const { card, queryClient } = renderCard({
      author: {
        id: '019a0000-0000-7000-8000-0000000000bb',
        username: 'bruno',
        displayName: 'Bruno',
        avatarUrl: null,
      },
    });

    // Assert the absence only once the session is known, or it would pass vacuously.
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0);
    });
    expect(within(card).queryByRole('button', { name: 'Delete chirp' })).not.toBeInTheDocument();
  });

  it('shows an attached image, loaded lazily', () => {
    const { card } = renderCard({
      imageUrl: 'http://storage.test/chirp-media/users/a/tweet/b.png',
    });

    const image = within(card).getByRole('img', { name: 'Image shared by Ana Torres' });
    expect(image).toHaveAttribute('src', 'http://storage.test/chirp-media/users/a/tweet/b.png');
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('shows no image when the chirp has none', () => {
    const { card } = renderCard();

    expect(within(card).queryByRole('img', { name: /Image shared by/ })).not.toBeInTheDocument();
  });
});
