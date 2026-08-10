CREATE TYPE "public"."audit_actor_kind" AS ENUM('ACCOUNT', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."audit_outcome" AS ENUM('SUCCESS', 'DENIED', 'FAILURE');--> statement-breakpoint
CREATE TYPE "public"."domain_audit_target_kind" AS ENUM('EMPLOYEE', 'ATTENDANCE', 'CORRECTION_REQUEST', 'ABSENCE_REQUEST', 'MONTHLY_PERIOD', 'TIME_ACCOUNT', 'LEAVE_ENTITLEMENT', 'TEAM', 'ASSIGNMENT', 'CONFIGURATION', 'EXPORT');--> statement-breakpoint
CREATE TYPE "public"."security_audit_target_kind" AS ENUM('ACCOUNT', 'SESSION', 'AUTHENTICATION', 'INVITATION', 'RECOVERY', 'AUTHORIZATION', 'EXPORT', 'OPERATIONS', 'BACKUP', 'SECRET', 'NOTIFICATION_DELIVERY');--> statement-breakpoint
CREATE TABLE "domain_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_kind" "audit_actor_kind" NOT NULL,
	"actor_account_id" uuid,
	"actor_system_process" varchar(128),
	"actor_role" "application_role",
	"action_code" varchar(80) NOT NULL,
	"outcome" "audit_outcome" NOT NULL,
	"subject_employee_id" uuid,
	"target_kind" "domain_audit_target_kind" NOT NULL,
	"target_id" varchar(160) NOT NULL,
	"reason_code" varchar(80),
	"restricted_reason_id" uuid,
	"facts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_id" uuid,
	"privileged" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "domain_audit_events_actor_shape" CHECK (("domain_audit_events"."actor_kind" = 'ACCOUNT' and "domain_audit_events"."actor_account_id" is not null and "domain_audit_events"."actor_system_process" is null) or ("domain_audit_events"."actor_kind" = 'SYSTEM' and "domain_audit_events"."actor_account_id" is null and "domain_audit_events"."actor_system_process" is not null and "domain_audit_events"."actor_role" is null)),
	CONSTRAINT "domain_audit_events_action_code_token" CHECK ("domain_audit_events"."action_code" ~ '^[A-Z][A-Z0-9_]{0,79}$'),
	CONSTRAINT "domain_audit_events_target_id_token" CHECK ("domain_audit_events"."target_id" ~ '^[A-Za-z0-9][A-Za-z0-9._:~-]{0,159}$'),
	CONSTRAINT "domain_audit_events_reason_code_token" CHECK ("domain_audit_events"."reason_code" is null or "domain_audit_events"."reason_code" ~ '^[A-Z][A-Z0-9_]{0,79}$'),
	CONSTRAINT "domain_audit_events_facts_object" CHECK (jsonb_typeof("domain_audit_events"."facts") = 'object'),
	CONSTRAINT "domain_audit_events_facts_size" CHECK (octet_length("domain_audit_events"."facts"::text) <= 4096)
);
--> statement-breakpoint
CREATE TABLE "security_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_kind" "audit_actor_kind" NOT NULL,
	"actor_account_id" uuid,
	"actor_system_process" varchar(128),
	"actor_role" "application_role",
	"action_code" varchar(80) NOT NULL,
	"outcome" "audit_outcome" NOT NULL,
	"target_account_id" uuid,
	"target_kind" "security_audit_target_kind" NOT NULL,
	"target_id" varchar(160) NOT NULL,
	"reason_code" varchar(80),
	"facts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_id" uuid,
	"privileged" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "security_audit_events_actor_shape" CHECK (("security_audit_events"."actor_kind" = 'ACCOUNT' and "security_audit_events"."actor_account_id" is not null and "security_audit_events"."actor_system_process" is null) or ("security_audit_events"."actor_kind" = 'SYSTEM' and "security_audit_events"."actor_account_id" is null and "security_audit_events"."actor_system_process" is not null and "security_audit_events"."actor_role" is null)),
	CONSTRAINT "security_audit_events_action_code_token" CHECK ("security_audit_events"."action_code" ~ '^[A-Z][A-Z0-9_]{0,79}$'),
	CONSTRAINT "security_audit_events_target_id_token" CHECK ("security_audit_events"."target_id" ~ '^[A-Za-z0-9][A-Za-z0-9._:~-]{0,159}$'),
	CONSTRAINT "security_audit_events_reason_code_token" CHECK ("security_audit_events"."reason_code" is null or "security_audit_events"."reason_code" ~ '^[A-Z][A-Z0-9_]{0,79}$'),
	CONSTRAINT "security_audit_events_facts_object" CHECK (jsonb_typeof("security_audit_events"."facts") = 'object'),
	CONSTRAINT "security_audit_events_facts_size" CHECK (octet_length("security_audit_events"."facts"::text) <= 4096)
);
--> statement-breakpoint
ALTER TABLE "domain_audit_events" ADD CONSTRAINT "domain_audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_audit_events" ADD CONSTRAINT "domain_audit_events_actor_account_id_auth_users_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_audit_events" ADD CONSTRAINT "domain_audit_events_subject_employee_id_employees_id_fk" FOREIGN KEY ("subject_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_audit_events" ADD CONSTRAINT "domain_audit_events_subject_employee_organization_fk" FOREIGN KEY ("organization_id", "subject_employee_id") REFERENCES "employees" ("organization_id", "id");--> statement-breakpoint
ALTER TABLE "security_audit_events" ADD CONSTRAINT "security_audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_audit_events" ADD CONSTRAINT "security_audit_events_actor_account_id_auth_users_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_audit_events" ADD CONSTRAINT "security_audit_events_target_account_id_auth_users_id_fk" FOREIGN KEY ("target_account_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "domain_audit_events_organization_time_idx" ON "domain_audit_events" USING btree ("organization_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "domain_audit_events_employee_time_idx" ON "domain_audit_events" USING btree ("organization_id","subject_employee_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "security_audit_events_organization_time_idx" ON "security_audit_events" USING btree ("organization_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "security_audit_events_account_time_idx" ON "security_audit_events" USING btree ("organization_id","target_account_id","occurred_at","id");--> statement-breakpoint
CREATE TRIGGER domain_audit_events_immutable BEFORE UPDATE OR DELETE ON "domain_audit_events" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();--> statement-breakpoint
CREATE TRIGGER security_audit_events_immutable BEFORE UPDATE OR DELETE ON "security_audit_events" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
