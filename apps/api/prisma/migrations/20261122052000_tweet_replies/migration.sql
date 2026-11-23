-- AlterTable
ALTER TABLE "tweets" ADD COLUMN     "parent_id" UUID;

-- CreateIndex
CREATE INDEX "tweets_parent_id_created_at_id_idx" ON "tweets"("parent_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "tweets" ADD CONSTRAINT "tweets_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tweets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

