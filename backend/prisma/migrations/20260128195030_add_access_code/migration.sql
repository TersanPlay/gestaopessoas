-- DropForeignKey
ALTER TABLE "visits" DROP CONSTRAINT "visits_hostId_fkey";

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "visitors" ADD COLUMN     "consentDate" TIMESTAMP(3),
ADD COLUMN     "consentGiven" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "visits" ADD COLUMN     "accessCode" TEXT,
ALTER COLUMN "hostId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
