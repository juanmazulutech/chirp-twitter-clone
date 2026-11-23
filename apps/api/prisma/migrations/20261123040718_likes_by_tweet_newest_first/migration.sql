-- DropIndex
DROP INDEX "likes_tweet_id_idx";

-- CreateIndex
CREATE INDEX "likes_tweet_id_created_at_user_id_idx" ON "likes"("tweet_id", "created_at" DESC, "user_id" DESC);
