import { describe, expect, it } from 'vitest';

import {
  markNotificationsReadBodySchema,
  notificationSchema,
  unreadCountSchema,
} from './notifications';

const actor = {
  id: '01900000-0000-7000-8000-000000000001',
  username: 'ana_codes',
  displayName: 'Ana',
  avatarUrl: null,
};
const base = {
  id: '01900000-0000-7000-8000-000000000002',
  actor,
  readAt: null,
  createdAt: '2026-11-23T10:00:00.000Z',
};
const tweet = { id: '01900000-0000-7000-8000-000000000003', content: 'Hello' };

describe('notificationSchema', () => {
  it('accepts a follow without a chirp and a like or reply with one', () => {
    expect(notificationSchema.parse({ ...base, type: 'FOLLOW', tweet: null }).type).toBe('FOLLOW');
    expect(notificationSchema.parse({ ...base, type: 'LIKE', tweet }).tweet).toEqual(tweet);
    expect(notificationSchema.parse({ ...base, type: 'REPLY', tweet }).tweet).toEqual(tweet);
  });

  it('rejects a follow about a chirp and a like without one', () => {
    expect(notificationSchema.safeParse({ ...base, type: 'FOLLOW', tweet }).success).toBe(false);
    expect(notificationSchema.safeParse({ ...base, type: 'LIKE', tweet: null }).success).toBe(
      false,
    );
  });

  it('rejects an unknown type', () => {
    expect(notificationSchema.safeParse({ ...base, type: 'MENTION', tweet }).success).toBe(false);
  });
});

describe('unreadCountSchema', () => {
  it.each([-1, 1.5])('rejects a count of %j', (count) => {
    expect(unreadCountSchema.safeParse({ count }).success).toBe(false);
  });
});

describe('markNotificationsReadBodySchema', () => {
  it('requires an ISO timestamp', () => {
    expect(markNotificationsReadBodySchema.parse({ until: base.createdAt })).toEqual({
      until: base.createdAt,
    });
    expect(markNotificationsReadBodySchema.safeParse({}).success).toBe(false);
    expect(markNotificationsReadBodySchema.safeParse({ until: 'yesterday' }).success).toBe(false);
  });
});
