import type {
  Notification,
  Prisma,
  PrismaClient,
  Tweet,
  User,
} from '../../src/generated/prisma/client';

type NotificationFields = Partial<
  Omit<Prisma.NotificationUncheckedCreateInput, 'recipientId' | 'actorId' | 'tweetId'>
>;

/**
 * Notifies `recipient` that `actor` acted; with a `tweet` it is a LIKE unless `type` says
 * otherwise, without one a FOLLOW. Any other field can be overridden.
 */
export async function createNotification(
  prisma: PrismaClient,
  recipient: Pick<User, 'id'>,
  actor: Pick<User, 'id'>,
  { tweet, ...overrides }: NotificationFields & { tweet?: Pick<Tweet, 'id'> } = {},
): Promise<Notification> {
  return prisma.notification.create({
    data: {
      type: tweet === undefined ? 'FOLLOW' : 'LIKE',
      recipientId: recipient.id,
      actorId: actor.id,
      tweetId: tweet?.id,
      ...overrides,
    },
  });
}
