import { z } from 'zod';

import { userSummarySchema } from './users';

/** The chirp a notification is about, enough for an excerpt and a link. */
const notificationTweetSchema = z.object({ id: z.uuid(), content: z.string() });

const notificationFields = {
  id: z.uuid(),
  actor: userSummarySchema,
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
};

/**
 * What happened, by whom (ADR-15). FOLLOW is about the recipient; LIKE is about their chirp;
 * REPLY's `tweet` is the reply itself, whose author is the actor.
 */
export const notificationSchema = z.discriminatedUnion('type', [
  z.object({ ...notificationFields, type: z.literal('FOLLOW'), tweet: z.null() }),
  z.object({ ...notificationFields, type: z.literal('LIKE'), tweet: notificationTweetSchema }),
  z.object({ ...notificationFields, type: z.literal('REPLY'), tweet: notificationTweetSchema }),
]);
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationType = Notification['type'];

export const unreadCountSchema = z.object({ count: z.number().int().nonnegative() });
export type UnreadCount = z.infer<typeof unreadCountSchema>;

/**
 * Marks as read every notification created up to `until`: the `createdAt` of the newest one
 * the client has shown, so one that arrived after the list loaded stays unread (ADR-15).
 */
export const markNotificationsReadBodySchema = z.object({ until: z.iso.datetime() });
export type MarkNotificationsReadBody = z.infer<typeof markNotificationsReadBodySchema>;
