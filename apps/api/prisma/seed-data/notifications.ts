// Notifications are not listed by hand: the seed derives them from its follows, likes and
// replies, applying the same rules as the API (ADR-15), so they can never disagree.

/** Each user's most recent notifications stay unread, so the demo account opens to a badge. */
export const SEED_UNREAD_PER_USER = 5;

/**
 * Follows carry no date in the seed, so a follow notification is dated when the follow first
 * became possible: once both people had joined.
 */
export function seedFollowNotificationDate(followerJoinedAt: Date, followedJoinedAt: Date): Date {
  return new Date(Math.max(followerJoinedAt.getTime(), followedJoinedAt.getTime()));
}

interface SeedNotificationDraft {
  recipientId: string;
  createdAt: Date;
}

/** Marks all but each recipient's `SEED_UNREAD_PER_USER` newest notifications as read at `now`. */
export function withSeedReadState<T extends SeedNotificationDraft>(
  now: Date,
  notifications: T[],
): Array<T & { readAt: Date | null }> {
  const newestFirst = [...notifications].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const seen = new Map<string, number>();
  return newestFirst.map((notification) => {
    const position = seen.get(notification.recipientId) ?? 0;
    seen.set(notification.recipientId, position + 1);
    return { ...notification, readAt: position < SEED_UNREAD_PER_USER ? null : now };
  });
}
