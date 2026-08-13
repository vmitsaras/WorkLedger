CREATE TYPE "public"."absence_cancellation_decision_action" AS ENUM('APPROVE', 'REJECT', 'REQUEST_CHANGES', 'WITHDRAW');--> statement-breakpoint
CREATE TYPE "public"."absence_cancellation_status" AS ENUM('PENDING_DECISION', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN');--> statement-breakpoint
CREATE TABLE "absence_cancellation_decisions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"absence_cancellation_id" uuid NOT NULL,
	"actor_employee_id" uuid NOT NULL,
	"action" "absence_cancellation_decision_action" NOT NULL,
	"reason" text,
	"decided_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "absence_cancellation_segments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"absence_cancellation_id" uuid NOT NULL,
	"absence_coverage_segment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "absence_cancellations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"absence_request_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"requested_by_employee_id" uuid NOT NULL,
	"status" "absence_cancellation_status" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "absence_cancellations_positive_version" CHECK ("absence_cancellations"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "absence_cancellation_decisions" ADD CONSTRAINT "absence_cancellation_decisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_cancellation_decisions" ADD CONSTRAINT "absence_cancellation_decisions_absence_cancellation_id_absence_cancellations_id_fk" FOREIGN KEY ("absence_cancellation_id") REFERENCES "public"."absence_cancellations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_cancellation_decisions" ADD CONSTRAINT "absence_cancellation_decisions_actor_employee_id_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_cancellation_segments" ADD CONSTRAINT "absence_cancellation_segments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_cancellation_segments" ADD CONSTRAINT "absence_cancellation_segments_absence_cancellation_id_absence_cancellations_id_fk" FOREIGN KEY ("absence_cancellation_id") REFERENCES "public"."absence_cancellations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_cancellation_segments" ADD CONSTRAINT "absence_cancellation_segments_absence_coverage_segment_id_absence_coverage_segments_id_fk" FOREIGN KEY ("absence_coverage_segment_id") REFERENCES "public"."absence_coverage_segments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_cancellations" ADD CONSTRAINT "absence_cancellations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_cancellations" ADD CONSTRAINT "absence_cancellations_absence_request_id_absence_requests_id_fk" FOREIGN KEY ("absence_request_id") REFERENCES "public"."absence_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_cancellations" ADD CONSTRAINT "absence_cancellations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_cancellations" ADD CONSTRAINT "absence_cancellations_requested_by_employee_id_employees_id_fk" FOREIGN KEY ("requested_by_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "absence_cancellation_decisions_cancellation_decided_idx" ON "absence_cancellation_decisions" USING btree ("absence_cancellation_id","decided_at");--> statement-breakpoint
CREATE UNIQUE INDEX "absence_cancellation_segments_cancellation_coverage_uidx" ON "absence_cancellation_segments" USING btree ("absence_cancellation_id","absence_coverage_segment_id");--> statement-breakpoint
CREATE INDEX "absence_cancellation_segments_coverage_idx" ON "absence_cancellation_segments" USING btree ("absence_coverage_segment_id");--> statement-breakpoint
CREATE INDEX "absence_cancellations_request_status_idx" ON "absence_cancellations" USING btree ("absence_request_id","status");--> statement-breakpoint
CREATE INDEX "absence_cancellations_employee_status_idx" ON "absence_cancellations" USING btree ("employee_id","status");