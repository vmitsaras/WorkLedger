CREATE TYPE "public"."notification_delivery_outcome" AS ENUM('DELIVERED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."notification_event" AS ENUM('ITEM_APPROVED', 'ITEM_REJECTED', 'ITEM_CHANGES_REQUESTED', 'ITEM_ACKNOWLEDGED');--> statement-breakpoint
CREATE TYPE "public"."notification_source_kind" AS ENUM('REQUEST', 'MONTHLY_PERIOD');--> statement-breakpoint
CREATE TABLE "notification_delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"notification_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"outcome" "notification_delivery_outcome" NOT NULL,
	"failure_code" varchar(80),
	"attempted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_delivery_attempts_positive_number" CHECK ("notification_delivery_attempts"."attempt_number" > 0),
	CONSTRAINT "notification_delivery_attempts_outcome_shape" CHECK (("notification_delivery_attempts"."outcome" = 'DELIVERED' and "notification_delivery_attempts"."failure_code" is null) or ("notification_delivery_attempts"."outcome" = 'FAILED' and "notification_delivery_attempts"."failure_code" ~ '^[A-Z][A-Z0-9_]{0,79}$'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recipient_account_id" uuid,
	"recipient_employee_id" uuid NOT NULL,
	"event" "notification_event" NOT NULL,
	"source_kind" "notification_source_kind" NOT NULL,
	"source_id" uuid NOT NULL,
	"source_version" integer NOT NULL,
	"destination_path" varchar(512) NOT NULL,
	"delivery_requested" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_organization_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "notifications_positive_source_version" CHECK ("notifications"."source_version" > 0),
	CONSTRAINT "notifications_destination_path" CHECK ("notifications"."destination_path" in ('/requests')),
	CONSTRAINT "notifications_dismissed_after_occurrence" CHECK ("notifications"."dismissed_at" is null or "notifications"."dismissed_at" >= "notifications"."occurred_at")
);
--> statement-breakpoint
ALTER TABLE "notification_delivery_attempts" ADD CONSTRAINT "notification_delivery_attempts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_delivery_attempts" ADD CONSTRAINT "notification_delivery_attempts_notification_organization_fk" FOREIGN KEY ("organization_id","notification_id") REFERENCES "public"."notifications"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_account_id_auth_users_id_fk" FOREIGN KEY ("recipient_account_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_employee_id_employees_id_fk" FOREIGN KEY ("recipient_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_employee_organization_fk" FOREIGN KEY ("organization_id","recipient_employee_id") REFERENCES "public"."employees"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_delivery_attempts_number_uidx" ON "notification_delivery_attempts" USING btree ("notification_id","attempt_number");--> statement-breakpoint
CREATE INDEX "notification_delivery_attempts_organization_time_idx" ON "notification_delivery_attempts" USING btree ("organization_id","attempted_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_source_recipient_event_version_uidx" ON "notifications" USING btree ("organization_id","recipient_employee_id","source_kind","source_id","event","source_version");--> statement-breakpoint
CREATE INDEX "notifications_recipient_employee_time_idx" ON "notifications" USING btree ("organization_id","recipient_employee_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_account_time_idx" ON "notifications" USING btree ("recipient_account_id","occurred_at","id");