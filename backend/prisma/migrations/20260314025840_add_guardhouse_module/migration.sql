-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('OFFICIAL', 'EMPLOYEE', 'VISITOR', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "SpotType" AS ENUM ('CAR', 'MOTORCYCLE');

-- CreateEnum
CREATE TYPE "SpotStatus" AS ENUM ('FREE', 'OCCUPIED', 'RESERVED', 'BLOCKED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "MovementStatus" AS ENUM ('PRESENT', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PhotoType" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "OccurrenceType" AS ENUM ('IRREGULAR_PARKING', 'MISSING_DOCUMENT', 'ACCESS_ATTEMPT', 'DAMAGE', 'NOTE');

-- CreateTable
CREATE TABLE "guardhouse_vehicles" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "category" "VehicleCategory" NOT NULL DEFAULT 'VISITOR',
    "vehicleType" "SpotType" NOT NULL DEFAULT 'CAR',
    "brand" TEXT,
    "model" TEXT,
    "color" TEXT,
    "manufactureYear" INTEGER,
    "sourceAgency" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardhouse_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardhouse_drivers" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "category" "VehicleCategory" NOT NULL DEFAULT 'VISITOR',
    "departmentId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardhouse_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardhouse_parking_spots" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "spotType" "SpotType" NOT NULL,
    "sector" TEXT,
    "status" "SpotStatus" NOT NULL DEFAULT 'FREE',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardhouse_parking_spots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardhouse_vehicle_movements" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "spotId" TEXT NOT NULL,
    "destinationDepartmentId" TEXT,
    "accessCategory" "VehicleCategory" NOT NULL,
    "visitReason" TEXT,
    "entryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "status" "MovementStatus" NOT NULL DEFAULT 'PRESENT',
    "entryNotes" TEXT,
    "exitNotes" TEXT,
    "registeredByEntryId" TEXT NOT NULL,
    "registeredByExitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardhouse_vehicle_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardhouse_movement_photos" (
    "id" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "photoType" "PhotoType" NOT NULL,
    "filePath" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardhouse_movement_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardhouse_vehicle_occurrences" (
    "id" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "occurrenceType" "OccurrenceType" NOT NULL,
    "description" TEXT NOT NULL,
    "registeredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardhouse_vehicle_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardhouse_vehicle_blocks" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "registeredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardhouse_vehicle_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guardhouse_vehicles_plate_key" ON "guardhouse_vehicles"("plate");

-- CreateIndex
CREATE INDEX "guardhouse_vehicles_plate_idx" ON "guardhouse_vehicles"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "guardhouse_drivers_document_key" ON "guardhouse_drivers"("document");

-- CreateIndex
CREATE INDEX "guardhouse_drivers_fullName_idx" ON "guardhouse_drivers"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "guardhouse_parking_spots_code_key" ON "guardhouse_parking_spots"("code");

-- CreateIndex
CREATE INDEX "guardhouse_parking_spots_spotType_status_idx" ON "guardhouse_parking_spots"("spotType", "status");

-- CreateIndex
CREATE INDEX "guardhouse_vehicle_movements_status_entryAt_idx" ON "guardhouse_vehicle_movements"("status", "entryAt");

-- CreateIndex
CREATE INDEX "guardhouse_vehicle_movements_vehicleId_status_idx" ON "guardhouse_vehicle_movements"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "guardhouse_vehicle_movements_spotId_status_idx" ON "guardhouse_vehicle_movements"("spotId", "status");

-- CreateIndex
CREATE INDEX "guardhouse_movement_photos_movementId_photoType_idx" ON "guardhouse_movement_photos"("movementId", "photoType");

-- CreateIndex
CREATE INDEX "guardhouse_vehicle_occurrences_movementId_occurrenceType_idx" ON "guardhouse_vehicle_occurrences"("movementId", "occurrenceType");

-- CreateIndex
CREATE INDEX "guardhouse_vehicle_blocks_vehicleId_isActive_idx" ON "guardhouse_vehicle_blocks"("vehicleId", "isActive");

-- AddForeignKey
ALTER TABLE "guardhouse_drivers" ADD CONSTRAINT "guardhouse_drivers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardhouse_vehicle_movements" ADD CONSTRAINT "guardhouse_vehicle_movements_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "guardhouse_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardhouse_vehicle_movements" ADD CONSTRAINT "guardhouse_vehicle_movements_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "guardhouse_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardhouse_vehicle_movements" ADD CONSTRAINT "guardhouse_vehicle_movements_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "guardhouse_parking_spots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardhouse_vehicle_movements" ADD CONSTRAINT "guardhouse_vehicle_movements_destinationDepartmentId_fkey" FOREIGN KEY ("destinationDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardhouse_vehicle_movements" ADD CONSTRAINT "guardhouse_vehicle_movements_registeredByEntryId_fkey" FOREIGN KEY ("registeredByEntryId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardhouse_vehicle_movements" ADD CONSTRAINT "guardhouse_vehicle_movements_registeredByExitId_fkey" FOREIGN KEY ("registeredByExitId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardhouse_movement_photos" ADD CONSTRAINT "guardhouse_movement_photos_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "guardhouse_vehicle_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardhouse_vehicle_occurrences" ADD CONSTRAINT "guardhouse_vehicle_occurrences_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "guardhouse_vehicle_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardhouse_vehicle_occurrences" ADD CONSTRAINT "guardhouse_vehicle_occurrences_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardhouse_vehicle_blocks" ADD CONSTRAINT "guardhouse_vehicle_blocks_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "guardhouse_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardhouse_vehicle_blocks" ADD CONSTRAINT "guardhouse_vehicle_blocks_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
