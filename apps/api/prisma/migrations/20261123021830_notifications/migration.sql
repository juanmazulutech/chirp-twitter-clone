-- Generated, then edited by hand (created with --create-only): NULLS NOT DISTINCT and the CHECK
-- constraints cannot be expressed in schema.prisma (ADR-15).

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FOLLOW', 'LIKE', 'REPLY');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipient_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "tweet_id" UUID,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    -- Nobody is notified about their own actions.
    CONSTRAINT "notifications_not_self_check" CHECK ("recipient_id" <> "actor_id"),
    -- FOLLOW is about a user; LIKE and REPLY are about a chirp.
    CONSTRAINT "notifications_tweet_check" CHECK (("type" = 'FOLLOW') = ("tweet_id" IS NULL))
);

-- CreateIndex
CREATE INDEX "notifications_recipient_id_created_at_id_idx" ON "notifications"("recipient_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "notifications_recipient_id_read_at_idx" ON "notifications"("recipient_id", "read_at");

-- One notification per action. NULLS NOT DISTINCT makes FOLLOW rows (tweet_id null) unique per
-- pair of users as well, so repeated or concurrent actions never notify twice.
CREATE UNIQUE INDEX "notifications_action_key" ON "notifications"("type", "recipient_id", "actor_id", "tweet_id") NULLS NOT DISTINCT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
