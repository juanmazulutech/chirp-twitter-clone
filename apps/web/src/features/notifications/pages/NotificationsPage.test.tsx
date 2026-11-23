import type { MarkNotificationsReadBody } from '@chirp/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { notificationFixture } from '@/test/fixtures';
import { scrollToEnd } from '@/test/intersection-observer';
import { notificationPages, notificationsMarkedRead, unreadCount } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

const liked = { id: '019a0000-0000-7000-8000-0000000000c1', content: 'Sourdough day' };
const reply = { id: '019a0000-0000-7000-8000-0000000000c2', content: 'Save me a slice' };

function notificationList() {
  return screen.findByRole('list', { name: 'Notifications' });
}

describe('NotificationsPage', () => {
  it('shows each kind of notification with links to where it happened', async () => {
    server.use(
      notificationPages([
        [
          notificationFixture({ type: 'REPLY', tweet: reply }),
          notificationFixture({ type: 'LIKE', tweet: liked }),
          notificationFixture(),
        ],
      ]),
      notificationsMarkedRead(),
    );
    renderRoute('/notifications');

    const list = await notificationList();
    const replyRow = within(list).getByRole('article', {
      name: 'New: Bruno Silva replied to your chirp',
    });
    expect(within(replyRow).getByRole('link', { name: 'Save me a slice' })).toHaveAttribute(
      'href',
      `/bruno/status/${reply.id}`,
    );
    const likeRow = within(list).getByRole('article', {
      name: 'New: Bruno Silva liked your chirp',
    });
    expect(within(likeRow).getByRole('link', { name: 'Sourdough day' })).toHaveAttribute(
      'href',
      `/ana_codes/status/${liked.id}`,
    );
    const followRow = within(list).getByRole('article', { name: 'New: Bruno Silva followed you' });
    expect(within(followRow).getByRole('link', { name: 'Bruno Silva' })).toHaveAttribute(
      'href',
      '/bruno',
    );
    expect(within(followRow).getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument();
  });

  it('labels unread notifications in words, not only by their background', async () => {
    server.use(
      notificationPages([
        [notificationFixture(), notificationFixture({ readAt: '2026-11-22T11:00:00.000Z' })],
      ]),
      notificationsMarkedRead(),
    );
    renderRoute('/notifications');

    const [unread, read] = within(await notificationList()).getAllByRole('article');
    expect(unread).toHaveAccessibleName('New: Bruno Silva followed you');
    expect(within(unread as HTMLElement).getByText('New')).toBeInTheDocument();
    expect(read).toHaveAccessibleName('Bruno Silva followed you');
    expect(within(read as HTMLElement).queryByText('New')).not.toBeInTheDocument();
  });

  it('marks as read up to the newest notification shown and clears the badge', async () => {
    let unread = 2;
    const bodies: MarkNotificationsReadBody[] = [];
    server.use(
      unreadCount(() => unread),
      notificationPages([
        [
          notificationFixture({ createdAt: '2026-11-22T12:00:00.000Z' }),
          notificationFixture({ createdAt: '2026-11-22T10:00:00.000Z' }),
        ],
      ]),
      notificationsMarkedRead((body) => {
        bodies.push(body);
        unread = 0;
      }),
    );
    renderRoute('/notifications');

    await waitFor(() => {
      expect(bodies).toEqual([{ until: '2026-11-22T12:00:00.000Z' }]);
    });
    await waitFor(() => {
      for (const link of screen.getAllByRole('link', { name: 'Notifications' })) {
        expect(link).toHaveAttribute('aria-current', 'page');
      }
    });
    // Still highlighted for this visit.
    expect(screen.getAllByRole('article', { name: /^New:/ })).toHaveLength(2);
  });

  it('does not mark anything when everything shown is already read', async () => {
    let marked = false;
    server.use(
      notificationPages([[notificationFixture({ readAt: '2026-11-22T11:00:00.000Z' })]]),
      notificationsMarkedRead(() => {
        marked = true;
      }),
    );
    renderRoute('/notifications');

    await notificationList();

    expect(marked).toBe(false);
  });

  it('loads older notifications at the end of the list', async () => {
    server.use(
      notificationPages([
        [notificationFixture({ readAt: '2026-11-22T11:00:00.000Z' })],
        [notificationFixture({ type: 'LIKE', tweet: liked, readAt: '2026-11-21T11:00:00.000Z' })],
      ]),
    );
    renderRoute('/notifications');
    await notificationList();

    scrollToEnd();

    expect(
      await screen.findByRole('article', { name: 'Bruno Silva liked your chirp' }),
    ).toBeInTheDocument();
    expect(screen.getByText('That’s every notification.')).toBeInTheDocument();
  });

  it('explains what will appear when there is nothing yet', async () => {
    server.use(notificationPages([[]]));
    renderRoute('/notifications');

    expect(await screen.findByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
  });

  it('offers to try again when the list fails to load', async () => {
    server.use(http.get('/api/notifications', () => HttpResponse.json({}, { status: 500 })));
    renderRoute('/notifications');

    expect(await screen.findByRole('alert')).toHaveTextContent('Notifications didn’t load');
  });
});
