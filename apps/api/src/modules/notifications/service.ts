import type { Notification, Page, PageQuery, UnreadCount } from '@chirp/shared';

import type { PrismaClient } from '../../generated/prisma/client';
import { decodeCursor, keysetAfter, newestFirst, toPage } from '../../lib/cursor';
import { notificationRowSelect, toNotification } from '../../lib/serializers';
import type { StorageService } from '../../lib/storage';

export interface NotificationsServiceDependencies {
  prisma: PrismaClient;
  storage: Pick<StorageService, 'publicUrl'>;
}

export type NotificationsService = ReturnType<typeof createNotificationsService>;

/** Reading notifications; they are created by the actions themselves (`rules.ts`, ADR-15). */
export function createNotificationsService({ prisma, storage }: NotificationsServiceDependencies) {
  const publicUrl = (key: string) => storage.publicUrl(key);

  /** The recipient's notifications, newest first. */
  async function list(
    recipientId: string,
    { cursor, limit }: PageQuery,
  ): Promise<Page<Notification>> {
    const after = cursor === undefined ? undefined : decodeCursor(cursor);
    const rows = await prisma.notification.findMany({
      where: { AND: [{ recipientId }, keysetAfter(after)] },
      orderBy: newestFirst,
      take: limit + 1,
      select: notificationRowSelect,
    });
    return toPage(rows, limit, (row) => toNotification(row, publicUrl));
  }

  async function unreadCount(recipientId: string): Promise<UnreadCount> {
    return { count: await prisma.notification.count({ where: { recipientId, readAt: null } }) };
  }

  /**
   * Marks as read what the client has shown: everything created up to `until`. A notification
   * that arrived after the list loaded is newer, so it stays unread (ADR-15). Idempotent.
   */
  async function markRead(recipientId: string, until: Date): Promise<void> {
    await prisma.notification.updateMany({
      where: { recipientId, readAt: null, createdAt: { lte: until } },
      data: { readAt: new Date() },
    });
  }

  return { list, unreadCount, markRead };
}
