-- Add docking enum for trip-level dispatcher-managed docking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DockingType') THEN
    CREATE TYPE "DockingType" AS ENUM ('PRIVATE', 'CITY');
  END IF;
END $$;

-- Captain defaults requested by business logic
ALTER TABLE "captain_rates"
  ALTER COLUMN "hourlyRate" SET DEFAULT 1600,
  ALTER COLUMN "exitPayment" SET DEFAULT 2500;

-- Trip table changes: remove dispatcher payout logic, move docking to dispatcher
ALTER TABLE "trips"
  DROP COLUMN IF EXISTS "dispatcherPayment",
  ALTER COLUMN "pierId" DROP NOT NULL,
  ALTER COLUMN "pierCost" SET DEFAULT 0;

ALTER TABLE "trips"
  ADD COLUMN IF NOT EXISTS "dockingType" "DockingType",
  ADD COLUMN IF NOT EXISTS "cityDockHours" DOUBLE PRECISION;

UPDATE "trips"
SET "pierCost" = COALESCE("pierCost", 0)
WHERE "pierCost" IS NULL;

-- Historical records become PRIVATE if no explicit docking metadata
UPDATE "trips"
SET "dockingType" = 'PRIVATE'::"DockingType"
WHERE "dockingType" IS NULL;

-- New captain side-income and fuel entities
CREATE TABLE IF NOT EXISTS "part_time_works" (
  "id" TEXT NOT NULL,
  "captainId" TEXT NOT NULL,
  "tripId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "comment" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "part_time_works_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fuel_expenses" (
  "id" TEXT NOT NULL,
  "captainId" TEXT NOT NULL,
  "tripId" TEXT,
  "liters" DOUBLE PRECISION,
  "amount" DOUBLE PRECISION NOT NULL,
  "comment" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fuel_expenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cash_handovers" (
  "id" TEXT NOT NULL,
  "captainId" TEXT NOT NULL,
  "forDate" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "receiverText" TEXT NOT NULL,
  "createdByCaptainAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "editedByDispatcherAt" TIMESTAMP(3),
  "editedByDispatcherId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cash_handovers_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_handovers_captainId_forDate_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'cash_handovers_captainId_forDate_key'
  ) THEN
    ALTER TABLE "cash_handovers"
      ADD CONSTRAINT "cash_handovers_captainId_forDate_key" UNIQUE ("captainId", "forDate");
  END IF;
END $$;

-- Foreign keys for new entities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'part_time_works_captainId_fkey'
  ) THEN
    ALTER TABLE "part_time_works"
      ADD CONSTRAINT "part_time_works_captainId_fkey"
      FOREIGN KEY ("captainId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'part_time_works_tripId_fkey'
  ) THEN
    ALTER TABLE "part_time_works"
      ADD CONSTRAINT "part_time_works_tripId_fkey"
      FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fuel_expenses_captainId_fkey'
  ) THEN
    ALTER TABLE "fuel_expenses"
      ADD CONSTRAINT "fuel_expenses_captainId_fkey"
      FOREIGN KEY ("captainId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fuel_expenses_tripId_fkey'
  ) THEN
    ALTER TABLE "fuel_expenses"
      ADD CONSTRAINT "fuel_expenses_tripId_fkey"
      FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_handovers_captainId_fkey'
  ) THEN
    ALTER TABLE "cash_handovers"
      ADD CONSTRAINT "cash_handovers_captainId_fkey"
      FOREIGN KEY ("captainId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_handovers_editedByDispatcherId_fkey'
  ) THEN
    ALTER TABLE "cash_handovers"
      ADD CONSTRAINT "cash_handovers_editedByDispatcherId_fkey"
      FOREIGN KEY ("editedByDispatcherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Dispatcher rates are no longer part of financial calculations
DROP TABLE IF EXISTS "dispatcher_rates";
