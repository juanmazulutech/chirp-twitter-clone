import type { Prisma } from '../../generated/prisma/client';

/**
 * Notification rules (ADR-15). Each function runs inside the transaction of the action that
 * causes it, so an action and its notification are committed or rolled back together.
 *
 * - Nobody is notified about their own actions.
 * - Inserts skip duplicates: the unique index on (type, recipient, actor, tweet) makes repeated
 *   and concurrent actions notify once.
 * - Undoing an action deletes its notification.
 */
type Transaction = Prisma.TransactionClient;

interface FollowAction {
  followerId: string;
  followingId: string;
}

interface LikeAction {
  likerId: string;
  tweetId: string;
  authorId: string;
}

interface ReplyAction {
  replyId: string;
  replierId: string;
  parentAuthorId: string;
}

export async function notifyFollow(tx: Transaction, action: FollowAction): Promise<void> {
  if (action.followerId === action.followingId) return;
  await tx.notification.createMany({
    data: { type: 'FOLLOW', recipientId: action.followingId, actorId: action.followerId },
    skipDuplicates: true,
  });
}

export async function retractFollow(tx: Transaction, action: FollowAction): Promise<void> {
  await tx.notification.deleteMany({
    where: { type: 'FOLLOW', recipientId: action.followingId, actorId: action.followerId },
  });
}

export async function notifyLike(tx: Transaction, action: LikeAction): Promise<void> {
  if (action.likerId === action.authorId) return;
  await tx.notification.createMany({
    data: {
      type: 'LIKE',
      recipientId: action.authorId,
      actorId: action.likerId,
      tweetId: action.tweetId,
    },
    skipDuplicates: true,
  });
}

/** Keyed on actor and tweet only: the author cannot change, so the recipient is implied. */
export async function retractLike(
  tx: Transaction,
  action: Omit<LikeAction, 'authorId'>,
): Promise<void> {
  await tx.notification.deleteMany({
    where: { type: 'LIKE', actorId: action.likerId, tweetId: action.tweetId },
  });
}

/** Only the direct parent's author is notified, not everyone earlier in the thread. */
export async function notifyReply(tx: Transaction, action: ReplyAction): Promise<void> {
  if (action.replierId === action.parentAuthorId) return;
  await tx.notification.createMany({
    data: {
      type: 'REPLY',
      recipientId: action.parentAuthorId,
      actorId: action.replierId,
      tweetId: action.replyId,
    },
    skipDuplicates: true,
  });
}
