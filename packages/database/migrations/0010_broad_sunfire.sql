ALTER TABLE "leave_entitlement_entries" ALTER COLUMN "entry_type" SET DATA TYPE text;--> statement-breakpoint
UPDATE "leave_entitlement_entries"
SET "entry_type" = CASE "entry_type"
  WHEN 'RESERVATION' THEN 'PENDING_RESERVATION'
  WHEN 'DEDUCTION' THEN 'APPROVED_DEDUCTION'
  WHEN 'RESTORATION' THEN 'CANCELLATION_RESTORATION'
  WHEN 'ADJUSTMENT' THEN 'MANUAL_ADJUSTMENT'
  ELSE "entry_type"
END;--> statement-breakpoint
DROP TYPE "public"."leave_entitlement_entry_type";--> statement-breakpoint
CREATE TYPE "public"."leave_entitlement_entry_type" AS ENUM('ALLOCATION', 'PENDING_RESERVATION', 'RESERVATION_RELEASE', 'APPROVED_DEDUCTION', 'CANCELLATION_RESTORATION', 'CARRYOVER', 'EXPIRY', 'MANUAL_ADJUSTMENT');--> statement-breakpoint
ALTER TABLE "leave_entitlement_entries" ALTER COLUMN "entry_type" SET DATA TYPE "public"."leave_entitlement_entry_type" USING "entry_type"::"public"."leave_entitlement_entry_type";--> statement-breakpoint
DROP INDEX "leave_entitlement_entries_employee_type_source_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "absence_types_organization_id_uidx" ON "absence_types" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "leave_entitlement_entries_employee_type_source_uidx" ON "leave_entitlement_entries" USING btree ("employee_id","absence_type_id","entry_type","source_id");
