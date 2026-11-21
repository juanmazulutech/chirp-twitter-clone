import { describe, expect, it } from 'vitest';

import { isSessionExpired, sessionExpiresAt, shouldRenewSession } from './session-policy';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-20T12:00:00.000Z');
const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);

describe('sessionExpiresAt', () => {
  it('adds the TTL in days', () => {
    expect(sessionExpiresAt(now, 30)).toEqual(new Date('2026-12-20T12:00:00.000Z'));
  });
});

describe('shouldRenewSession', () => {
  it('does not renew a fresh session', () => {
    expect(shouldRenewSession(sessionExpiresAt(now, 30), now, 30)).toBe(false);
  });

  it('does not renew with exactly half of the lifetime left', () => {
    expect(shouldRenewSession(at(15 * DAY), now, 30)).toBe(false);
  });

  it('renews once less than half of the lifetime is left', () => {
    expect(shouldRenewSession(at(15 * DAY - 1), now, 30)).toBe(true);
  });
});

describe('isSessionExpired', () => {
  it('is not expired before the expiry instant', () => {
    expect(isSessionExpired(at(1), now)).toBe(false);
  });

  it('is expired at and after the expiry instant', () => {
    expect(isSessionExpired(now, now)).toBe(true);
    expect(isSessionExpired(at(-1), now)).toBe(true);
  });
});
