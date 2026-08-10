CREATE TYPE "public"."absence_coverage_kind" AS ENUM('FULL_DAY', 'FIRST_HALF', 'SECOND_HALF', 'MINUTE_INTERVAL');--> statement-breakpoint
CREATE TYPE "public"."absence_request_status" AS ENUM('SUBMITTED', 'REPORTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'PARTIALLY_CANCELLED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."attendance_state" AS ENUM('OFF_WORK', 'WORKING', 'ON_BREAK');--> statement-breakpoint
CREATE TYPE "public"."calculation_status" AS ENUM('PROVISIONAL', 'INCOMPLETE', 'COMPLETE');--> statement-breakpoint
CREATE TYPE "public"."decision_action" AS ENUM('APPROVE', 'REJECT', 'REQUEST_CHANGES', 'ACKNOWLEDGE', 'WITHDRAW', 'CANCEL');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."leave_entitlement_entry_type" AS ENUM('ALLOCATION', 'RESERVATION', 'RESERVATION_RELEASE', 'DEDUCTION', 'RESTORATION', 'EXPIRY', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."ledger_actor_kind" AS ENUM('ACCOUNT', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."period_status" AS ENUM('OPEN', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'LOCKED');--> statement-breakpoint
CREATE TYPE "public"."punch_event_type" AS ENUM('CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT');--> statement-breakpoint
CREATE TYPE "public"."time_account_entry_type" AS ENUM('OPENING_BALANCE', 'DAILY_DELTA', 'DAILY_RECALCULATION_DELTA', 'POST_LOCK_ADJUSTMENT', 'MANUAL_ADMINISTRATIVE_ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."workflow_status" AS ENUM('SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN');--> statement-breakpoint
CREATE TABLE "absence_coverage_segments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"absence_request_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"kind" "absence_coverage_kind" NOT NULL,
	"starts_at_minute" integer,
	"ends_at_minute" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "absence_coverage_minute_shape" CHECK (("absence_coverage_segments"."kind" = 'MINUTE_INTERVAL' and "absence_coverage_segments"."starts_at_minute" between 0 and 1439 and "absence_coverage_segments"."ends_at_minute" between 1 and 1440 and "absence_coverage_segments"."starts_at_minute" < "absence_coverage_segments"."ends_at_minute") or ("absence_coverage_segments"."kind" <> 'MINUTE_INTERVAL' and "absence_coverage_segments"."starts_at_minute" is null and "absence_coverage_segments"."ends_at_minute" is null))
);
--> statement-breakpoint
CREATE TABLE "absence_decisions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"absence_request_id" uuid NOT NULL,
	"actor_employee_id" uuid NOT NULL,
	"action" "decision_action" NOT NULL,
	"reason" text,
	"decided_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "absence_effects" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"absence_request_id" uuid NOT NULL,
	"absence_coverage_segment_id" uuid NOT NULL,
	"source_decision_id" uuid,
	"employee_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"expected_reduction_minutes" integer NOT NULL,
	"credit_minutes" integer NOT NULL,
	"entitlement_minutes" integer NOT NULL,
	"effect_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "absence_effects_non_negative_minutes" CHECK ("absence_effects"."expected_reduction_minutes" >= 0 and "absence_effects"."credit_minutes" >= 0 and "absence_effects"."entitlement_minutes" >= 0),
	CONSTRAINT "absence_effects_positive_version" CHECK ("absence_effects"."effect_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "absence_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"absence_type_id" uuid NOT NULL,
	"requested_by_employee_id" uuid NOT NULL,
	"status" "absence_request_status" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "absence_requests_positive_version" CHECK ("absence_requests"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "absence_types" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(160) NOT NULL,
	"version" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"policy" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "absence_types_positive_version" CHECK ("absence_types"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "applied_corrections" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"correction_request_id" uuid NOT NULL,
	"correction_decision_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"version" integer NOT NULL,
	"interpretation" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applied_corrections_positive_version" CHECK ("applied_corrections"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "approved_monthly_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"monthly_period_id" uuid NOT NULL,
	"period_version" integer NOT NULL,
	"schema_version" integer NOT NULL,
	"engine_version" varchar(64) NOT NULL,
	"source_fingerprint" varchar(64) NOT NULL,
	"snapshot_fingerprint" varchar(64) NOT NULL,
	"approved_by_employee_id" uuid NOT NULL,
	"approved_at" timestamp with time zone NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approved_monthly_snapshots_positive_versions" CHECK ("approved_monthly_snapshots"."period_version" > 0 and "approved_monthly_snapshots"."schema_version" > 0),
	CONSTRAINT "approved_monthly_snapshots_source_fingerprint_hex" CHECK ("approved_monthly_snapshots"."source_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "approved_monthly_snapshots_snapshot_fingerprint_hex" CHECK ("approved_monthly_snapshots"."snapshot_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "approved_monthly_snapshots_object" CHECK (jsonb_typeof("approved_monthly_snapshots"."snapshot") = 'object')
);
--> statement-breakpoint
CREATE TABLE "attendance_heads" (
	"employee_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"state" "attendance_state" DEFAULT 'OFF_WORK' NOT NULL,
	"attendance_revision" integer DEFAULT 0 NOT NULL,
	"next_event_sequence" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_heads_non_negative_revision" CHECK ("attendance_heads"."attendance_revision" >= 0),
	CONSTRAINT "attendance_heads_positive_next_sequence" CHECK ("attendance_heads"."next_event_sequence" > 0)
);
--> statement-breakpoint
CREATE TABLE "correction_decisions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"correction_request_id" uuid NOT NULL,
	"actor_employee_id" uuid NOT NULL,
	"action" "decision_action" NOT NULL,
	"reason" text,
	"decided_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "correction_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"requested_by_employee_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"status" "workflow_status" DEFAULT 'SUBMITTED' NOT NULL,
	"reason" text NOT NULL,
	"proposed_interpretation" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "correction_requests_reason_not_blank" CHECK (length(btrim("correction_requests"."reason")) > 0),
	CONSTRAINT "correction_requests_positive_version" CHECK ("correction_requests"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "daily_projections" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"calculation_status" "calculation_status" NOT NULL,
	"projection_version" integer NOT NULL,
	"engine_version" varchar(64) NOT NULL,
	"source_fingerprint" varchar(64) NOT NULL,
	"expected_minutes" integer NOT NULL,
	"worked_minutes" integer NOT NULL,
	"break_minutes" integer NOT NULL,
	"absence_credit_minutes" integer NOT NULL,
	"adjustment_minutes" integer NOT NULL,
	"credited_minutes" integer NOT NULL,
	"balance_minutes" integer NOT NULL,
	"warning_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_references" jsonb NOT NULL,
	"calculated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "daily_projections_positive_version" CHECK ("daily_projections"."projection_version" > 0),
	CONSTRAINT "daily_projections_fingerprint_hex" CHECK ("daily_projections"."source_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "daily_projections_non_negative_base_minutes" CHECK ("daily_projections"."expected_minutes" >= 0 and "daily_projections"."worked_minutes" >= 0 and "daily_projections"."break_minutes" >= 0 and "daily_projections"."absence_credit_minutes" >= 0),
	CONSTRAINT "daily_projections_credited_reconciles" CHECK ("daily_projections"."credited_minutes" = "daily_projections"."worked_minutes" + "daily_projections"."absence_credit_minutes" + "daily_projections"."adjustment_minutes"),
	CONSTRAINT "daily_projections_balance_reconciles" CHECK ("daily_projections"."balance_minutes" = "daily_projections"."credited_minutes" - "daily_projections"."expected_minutes"),
	CONSTRAINT "daily_projections_warning_codes_array" CHECK (jsonb_typeof("daily_projections"."warning_codes") = 'array'),
	CONSTRAINT "daily_projections_sources_object" CHECK (jsonb_typeof("daily_projections"."source_references") = 'object')
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_number" varchar(64) NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"status" "employee_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_display_name_not_blank" CHECK (length(btrim("employees"."display_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "employment_periods" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employment_periods_valid_range" CHECK ("employment_periods"."ends_on" is null or "employment_periods"."starts_on" < "employment_periods"."ends_on")
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"holiday_date" date NOT NULL,
	"name" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_scope" varchar(160) NOT NULL,
	"command" varchar(80) NOT NULL,
	"idempotency_key_hash" varchar(64) NOT NULL,
	"request_fingerprint" varchar(64) NOT NULL,
	"outcome" jsonb,
	"terminal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "idempotency_records_key_hash_hex" CHECK ("idempotency_records"."idempotency_key_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "idempotency_records_request_fingerprint_hex" CHECK ("idempotency_records"."request_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "idempotency_records_terminal_shape" CHECK (not "idempotency_records"."terminal" or ("idempotency_records"."outcome" is not null and "idempotency_records"."completed_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "leave_entitlement_entries" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"absence_type_id" uuid NOT NULL,
	"entry_type" "leave_entitlement_entry_type" NOT NULL,
	"minutes" integer NOT NULL,
	"source_id" uuid NOT NULL,
	"effective_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_assignments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"manager_employee_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manager_assignments_not_self" CHECK ("manager_assignments"."employee_id" <> "manager_assignments"."manager_employee_id"),
	CONSTRAINT "manager_assignments_valid_range" CHECK ("manager_assignments"."ends_on" is null or "manager_assignments"."starts_on" < "manager_assignments"."ends_on")
);
--> statement-breakpoint
CREATE TABLE "monthly_periods" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"month_start" date NOT NULL,
	"status" "period_status" DEFAULT 'OPEN' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_periods_first_day" CHECK (extract(day from "monthly_periods"."month_start") = 1),
	CONSTRAINT "monthly_periods_positive_version" CHECK ("monthly_periods"."version" > 0),
	CONSTRAINT "monthly_periods_lock_shape" CHECK ("monthly_periods"."status" <> 'LOCKED' or "monthly_periods"."locked_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" varchar(160) NOT NULL,
	"time_zone" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_name_not_blank" CHECK (length(btrim("organizations"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "policy_assignments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policy_assignments_valid_range" CHECK ("policy_assignments"."ends_on" is null or "policy_assignments"."starts_on" < "policy_assignments"."ends_on")
);
--> statement-breakpoint
CREATE TABLE "post_lock_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"monthly_snapshot_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"minutes" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_lock_adjustments_non_zero_minutes" CHECK ("post_lock_adjustments"."minutes" <> 0),
	CONSTRAINT "post_lock_adjustments_reason_not_blank" CHECK (length(btrim("post_lock_adjustments"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "punch_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"event_sequence" integer NOT NULL,
	"event_type" "punch_event_type" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_employee_id" uuid,
	"command_id" uuid NOT NULL,
	CONSTRAINT "punch_events_positive_sequence" CHECK ("punch_events"."event_sequence" > 0)
);
--> statement-breakpoint
CREATE TABLE "schedule_assignments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_assignments_valid_range" CHECK ("schedule_assignments"."ends_on" is null or "schedule_assignments"."starts_on" < "schedule_assignments"."ends_on")
);
--> statement-breakpoint
CREATE TABLE "team_assignments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_assignments_valid_range" CHECK ("team_assignments"."ends_on" is null or "team_assignments"."starts_on" < "team_assignments"."ends_on")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_account_entries" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"entry_type" time_account_entry_type NOT NULL,
	"minutes" integer NOT NULL,
	"source_id" uuid NOT NULL,
	"source_fingerprint" varchar(64) NOT NULL,
	"actor_kind" "ledger_actor_kind" NOT NULL,
	"actor_id" varchar(128) NOT NULL,
	"explanation_code" varchar(128) NOT NULL,
	"posted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_account_entries_actor_id_not_blank" CHECK (length(btrim("time_account_entries"."actor_id")) > 0),
	CONSTRAINT "time_account_entries_explanation_not_blank" CHECK (length(btrim("time_account_entries"."explanation_code")) > 0),
	CONSTRAINT "time_account_entries_non_zero_minutes" CHECK ("time_account_entries"."minutes" <> 0 or "time_account_entries"."entry_type" = 'OPENING_BALANCE'),
	CONSTRAINT "time_account_entries_fingerprint_hex" CHECK ("time_account_entries"."source_fingerprint" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "time_policies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"version" integer NOT NULL,
	"rules" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_policies_positive_version" CHECK ("time_policies"."version" > 0),
	CONSTRAINT "time_policies_rules_object" CHECK (jsonb_typeof("time_policies"."rules") = 'object')
);
--> statement-breakpoint
CREATE TABLE "weekly_schedules" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"version" integer NOT NULL,
	"monday_minutes" integer NOT NULL,
	"tuesday_minutes" integer NOT NULL,
	"wednesday_minutes" integer NOT NULL,
	"thursday_minutes" integer NOT NULL,
	"friday_minutes" integer NOT NULL,
	"saturday_minutes" integer NOT NULL,
	"sunday_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_schedules_positive_version" CHECK ("weekly_schedules"."version" > 0),
	CONSTRAINT "weekly_schedules_minutes_bounds" CHECK ("weekly_schedules"."monday_minutes" between 0 and 1440 and "weekly_schedules"."tuesday_minutes" between 0 and 1440 and "weekly_schedules"."wednesday_minutes" between 0 and 1440 and "weekly_schedules"."thursday_minutes" between 0 and 1440 and "weekly_schedules"."friday_minutes" between 0 and 1440 and "weekly_schedules"."saturday_minutes" between 0 and 1440 and "weekly_schedules"."sunday_minutes" between 0 and 1440)
);
--> statement-breakpoint
ALTER TABLE "absence_coverage_segments" ADD CONSTRAINT "absence_coverage_segments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_coverage_segments" ADD CONSTRAINT "absence_coverage_segments_absence_request_id_absence_requests_id_fk" FOREIGN KEY ("absence_request_id") REFERENCES "public"."absence_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_decisions" ADD CONSTRAINT "absence_decisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_decisions" ADD CONSTRAINT "absence_decisions_absence_request_id_absence_requests_id_fk" FOREIGN KEY ("absence_request_id") REFERENCES "public"."absence_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_decisions" ADD CONSTRAINT "absence_decisions_actor_employee_id_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_effects" ADD CONSTRAINT "absence_effects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_effects" ADD CONSTRAINT "absence_effects_absence_request_id_absence_requests_id_fk" FOREIGN KEY ("absence_request_id") REFERENCES "public"."absence_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_effects" ADD CONSTRAINT "absence_effects_absence_coverage_segment_id_absence_coverage_segments_id_fk" FOREIGN KEY ("absence_coverage_segment_id") REFERENCES "public"."absence_coverage_segments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_effects" ADD CONSTRAINT "absence_effects_source_decision_id_absence_decisions_id_fk" FOREIGN KEY ("source_decision_id") REFERENCES "public"."absence_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_effects" ADD CONSTRAINT "absence_effects_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_absence_type_id_absence_types_id_fk" FOREIGN KEY ("absence_type_id") REFERENCES "public"."absence_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_requested_by_employee_id_employees_id_fk" FOREIGN KEY ("requested_by_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_types" ADD CONSTRAINT "absence_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applied_corrections" ADD CONSTRAINT "applied_corrections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applied_corrections" ADD CONSTRAINT "applied_corrections_correction_request_id_correction_requests_id_fk" FOREIGN KEY ("correction_request_id") REFERENCES "public"."correction_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applied_corrections" ADD CONSTRAINT "applied_corrections_correction_decision_id_correction_decisions_id_fk" FOREIGN KEY ("correction_decision_id") REFERENCES "public"."correction_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applied_corrections" ADD CONSTRAINT "applied_corrections_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ADD CONSTRAINT "approved_monthly_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ADD CONSTRAINT "approved_monthly_snapshots_monthly_period_id_monthly_periods_id_fk" FOREIGN KEY ("monthly_period_id") REFERENCES "public"."monthly_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ADD CONSTRAINT "approved_monthly_snapshots_approved_by_employee_id_employees_id_fk" FOREIGN KEY ("approved_by_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_heads" ADD CONSTRAINT "attendance_heads_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_heads" ADD CONSTRAINT "attendance_heads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_decisions" ADD CONSTRAINT "correction_decisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_decisions" ADD CONSTRAINT "correction_decisions_correction_request_id_correction_requests_id_fk" FOREIGN KEY ("correction_request_id") REFERENCES "public"."correction_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_decisions" ADD CONSTRAINT "correction_decisions_actor_employee_id_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_requested_by_employee_id_employees_id_fk" FOREIGN KEY ("requested_by_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_projections" ADD CONSTRAINT "daily_projections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_projections" ADD CONSTRAINT "daily_projections_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_periods" ADD CONSTRAINT "employment_periods_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_periods" ADD CONSTRAINT "employment_periods_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_entitlement_entries" ADD CONSTRAINT "leave_entitlement_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_entitlement_entries" ADD CONSTRAINT "leave_entitlement_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_entitlement_entries" ADD CONSTRAINT "leave_entitlement_entries_absence_type_id_absence_types_id_fk" FOREIGN KEY ("absence_type_id") REFERENCES "public"."absence_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_manager_employee_id_employees_id_fk" FOREIGN KEY ("manager_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_periods" ADD CONSTRAINT "monthly_periods_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_periods" ADD CONSTRAINT "monthly_periods_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_policy_id_time_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."time_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_lock_adjustments" ADD CONSTRAINT "post_lock_adjustments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_lock_adjustments" ADD CONSTRAINT "post_lock_adjustments_monthly_snapshot_id_approved_monthly_snapshots_id_fk" FOREIGN KEY ("monthly_snapshot_id") REFERENCES "public"."approved_monthly_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_lock_adjustments" ADD CONSTRAINT "post_lock_adjustments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_events" ADD CONSTRAINT "punch_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_events" ADD CONSTRAINT "punch_events_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_events" ADD CONSTRAINT "punch_events_actor_employee_id_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_schedule_id_weekly_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."weekly_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_account_entries" ADD CONSTRAINT "time_account_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_account_entries" ADD CONSTRAINT "time_account_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_policies" ADD CONSTRAINT "time_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_schedules" ADD CONSTRAINT "weekly_schedules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "absence_coverage_request_date_idx" ON "absence_coverage_segments" USING btree ("absence_request_id","local_date");--> statement-breakpoint
CREATE INDEX "absence_decisions_request_decided_idx" ON "absence_decisions" USING btree ("absence_request_id","decided_at");--> statement-breakpoint
CREATE UNIQUE INDEX "absence_effects_segment_version_uidx" ON "absence_effects" USING btree ("absence_coverage_segment_id","effect_version");--> statement-breakpoint
CREATE INDEX "absence_effects_employee_date_idx" ON "absence_effects" USING btree ("employee_id","local_date");--> statement-breakpoint
CREATE INDEX "absence_requests_employee_status_submitted_idx" ON "absence_requests" USING btree ("employee_id","status","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "absence_types_organization_code_version_uidx" ON "absence_types" USING btree ("organization_id","code","version");--> statement-breakpoint
CREATE UNIQUE INDEX "applied_corrections_request_version_uidx" ON "applied_corrections" USING btree ("correction_request_id","version");--> statement-breakpoint
CREATE INDEX "applied_corrections_employee_date_idx" ON "applied_corrections" USING btree ("employee_id","local_date");--> statement-breakpoint
CREATE UNIQUE INDEX "approved_monthly_snapshots_period_version_uidx" ON "approved_monthly_snapshots" USING btree ("monthly_period_id","period_version");--> statement-breakpoint
CREATE INDEX "correction_decisions_request_decided_idx" ON "correction_decisions" USING btree ("correction_request_id","decided_at");--> statement-breakpoint
CREATE INDEX "correction_requests_employee_date_status_idx" ON "correction_requests" USING btree ("employee_id","local_date","status");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_projections_employee_date_uidx" ON "daily_projections" USING btree ("employee_id","local_date");--> statement-breakpoint
CREATE INDEX "daily_projections_organization_date_status_idx" ON "daily_projections" USING btree ("organization_id","local_date","calculation_status");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_organization_employee_number_uidx" ON "employees" USING btree ("organization_id","employee_number");--> statement-breakpoint
CREATE INDEX "employees_organization_status_idx" ON "employees" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "employment_periods_employee_dates_idx" ON "employment_periods" USING btree ("employee_id","starts_on","ends_on");--> statement-breakpoint
CREATE UNIQUE INDEX "holidays_organization_date_uidx" ON "holidays" USING btree ("organization_id","holiday_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_records_scope_command_key_uidx" ON "idempotency_records" USING btree ("organization_id","actor_scope","command","idempotency_key_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "leave_entitlement_entries_employee_type_source_uidx" ON "leave_entitlement_entries" USING btree ("employee_id","entry_type","source_id");--> statement-breakpoint
CREATE INDEX "leave_entitlement_entries_employee_type_date_idx" ON "leave_entitlement_entries" USING btree ("employee_id","absence_type_id","effective_on");--> statement-breakpoint
CREATE INDEX "manager_assignments_employee_dates_idx" ON "manager_assignments" USING btree ("employee_id","starts_on","ends_on");--> statement-breakpoint
CREATE INDEX "manager_assignments_manager_dates_idx" ON "manager_assignments" USING btree ("manager_employee_id","starts_on","ends_on");--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_periods_employee_month_uidx" ON "monthly_periods" USING btree ("employee_id","month_start");--> statement-breakpoint
CREATE INDEX "monthly_periods_organization_status_month_idx" ON "monthly_periods" USING btree ("organization_id","status","month_start");--> statement-breakpoint
CREATE INDEX "policy_assignments_employee_dates_idx" ON "policy_assignments" USING btree ("employee_id","starts_on","ends_on");--> statement-breakpoint
CREATE UNIQUE INDEX "post_lock_adjustments_snapshot_source_uidx" ON "post_lock_adjustments" USING btree ("monthly_snapshot_id","source_id");--> statement-breakpoint
CREATE INDEX "post_lock_adjustments_employee_date_idx" ON "post_lock_adjustments" USING btree ("employee_id","local_date");--> statement-breakpoint
CREATE UNIQUE INDEX "punch_events_employee_sequence_uidx" ON "punch_events" USING btree ("employee_id","event_sequence");--> statement-breakpoint
CREATE INDEX "punch_events_employee_occurred_idx" ON "punch_events" USING btree ("employee_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "punch_events_employee_command_sequence_uidx" ON "punch_events" USING btree ("employee_id","command_id","event_sequence");--> statement-breakpoint
CREATE INDEX "schedule_assignments_employee_dates_idx" ON "schedule_assignments" USING btree ("employee_id","starts_on","ends_on");--> statement-breakpoint
CREATE INDEX "team_assignments_employee_dates_idx" ON "team_assignments" USING btree ("employee_id","starts_on","ends_on");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_organization_name_uidx" ON "teams" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "time_account_entries_employee_source_uidx" ON "time_account_entries" USING btree ("employee_id","source_id");--> statement-breakpoint
CREATE INDEX "time_account_entries_employee_date_idx" ON "time_account_entries" USING btree ("employee_id","local_date");--> statement-breakpoint
CREATE UNIQUE INDEX "time_policies_organization_name_version_uidx" ON "time_policies" USING btree ("organization_id","name","version");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_schedules_organization_name_version_uidx" ON "weekly_schedules" USING btree ("organization_id","name","version");