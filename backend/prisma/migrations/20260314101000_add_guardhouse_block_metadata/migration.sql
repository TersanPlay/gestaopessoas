-- AlterTable
ALTER TABLE "guardhouse_vehicle_blocks"
ADD COLUMN "notes" TEXT,
ADD COLUMN "unblockedById" TEXT;

-- CreateIndex
CREATE INDEX "guardhouse_vehicle_blocks_unblockedById_idx" ON "guardhouse_vehicle_blocks"("unblockedById");

-- AddForeignKey
ALTER TABLE "guardhouse_vehicle_blocks"
ADD CONSTRAINT "guardhouse_vehicle_blocks_unblockedById_fkey"
FOREIGN KEY ("unblockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
