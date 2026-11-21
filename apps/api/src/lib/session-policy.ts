const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** When a session created (or renewed) at `now` expires. */
export function sessionExpiresAt(now: Date, ttlDays: number): Date {
  return new Date(now.getTime() + ttlDays * MS_PER_DAY);
}

/**
 * Sliding expiration (ADR-09): renew once less than half of the lifetime remains, so
 * active users stay signed in while the database is written at most every ttl/2.
 */
export function shouldRenewSession(expiresAt: Date, now: Date, ttlDays: number): boolean {
  const remaining = expiresAt.getTime() - now.getTime();
  return remaining < (ttlDays * MS_PER_DAY) / 2;
}

export function isSessionExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}
