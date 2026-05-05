-- AlterEnum
-- This migration adds the new enum value and updates existing records
BEGIN;

-- Create new enum value
ALTER TYPE "CourierProvider" ADD VALUE 'PARCEL_DAILY';

-- Update existing courier accounts that use OTHERS to PARCEL_DAILY
UPDATE "CourierAccount" SET "provider" = 'PARCEL_DAILY' WHERE "provider" = 'OTHERS';

-- Remove old enum value (PostgreSQL doesn't support removing enum values directly in a transaction)
-- After this migration runs successfully, you may need to manually remove 'OTHERS' from the enum if using PostgreSQL

COMMIT;
