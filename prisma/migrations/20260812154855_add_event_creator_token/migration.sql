-- AlterTable
ALTER TABLE "Event" ADD COLUMN "creatorToken" TEXT;

-- Backfill pre-existing rows with a placeholder token derived from the row's
-- own id. These events predate this feature and were created in a browser
-- that never stored a creatorToken, so nobody can ever produce this value
-- from localStorage -- they simply can't be creator-edited, which is an
-- acceptable trade-off for a personal project.
UPDATE "Event" SET "creatorToken" = 'legacy-' || "id" WHERE "creatorToken" IS NULL;

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "creatorToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Event_creatorToken_key" ON "Event"("creatorToken");
