ALTER TABLE "absence_types" ADD COLUMN "valid_from" date DEFAULT '0001-01-01' NOT NULL;--> statement-breakpoint
ALTER TABLE "absence_types" ADD COLUMN "valid_to" date;--> statement-breakpoint
ALTER TABLE "absence_types" ADD CONSTRAINT "absence_types_valid_date_range" CHECK ("absence_types"."valid_to" is null or "absence_types"."valid_from" < "absence_types"."valid_to");--> statement-breakpoint
ALTER TABLE "absence_types" ALTER COLUMN "valid_from" DROP DEFAULT;
