import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { unreadCount } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

import { UNREAD_POLL_INTERVAL_MS } from '../hooks';

/** jsdom applies no CSS, so the rail and the bottom bar both render the link. */
const notificationLinks = (name: string | RegExp) => screen.findAllByRole('link', { name });

describe('unread notifications badge', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the unread count on every Notifications link, exactly in its name', async () => {
    server.use(unreadCount(3));
    renderRoute('/home');

    const links = await notificationLinks('Notifications, 3 unread');
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/notifications');
      expect(link).toHaveTextContent('3');
    }
  });

  it('caps the figure at 9+ but keeps the exact count in the name', async () => {
    server.use(unreadCount(42));
    renderRoute('/home');

    for (const link of await notificationLinks('Notifications, 42 unread')) {
      expect(link).toHaveTextContent('9+');
    }
  });

  it('shows no badge without unread notifications', async () => {
    renderRoute('/home');

    for (const link of await notificationLinks('Notifications')) {
      expect(link.textContent).toBe('Notifications');
    }
  });

  it('polls, so new notifications raise the badge without reloading', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let count = 0;
    server.use(unreadCount(() => count));
    renderRoute('/home');
    await notificationLinks('Notifications');

    count = 1;
    await act(() => vi.advanceTimersByTimeAsync(UNREAD_POLL_INTERVAL_MS));

    expect(await notificationLinks('Notifications, 1 unread')).toHaveLength(2);
  });
});
