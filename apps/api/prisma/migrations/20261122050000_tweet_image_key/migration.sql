-- AlterTable
ALTER TABLE "tweets" ADD COLUMN     "image_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tweets_image_key_key" ON "tweets"("image_key");

