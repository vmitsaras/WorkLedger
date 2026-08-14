CREATE TYPE "public"."monthly_period_decision_action" AS ENUM('REQUEST_CHANGES', 'APPROVE', 'LOCK');--> statement-breakpoint
CREATE TABLE "monthly_period_decisions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"monthly_period_id" uuid NOT NULL,
	"actor_account_id" uuid NOT NULL,
	"actor_employee_id" uuid,
	"actor_authority" "decision_actor_authority" NOT NULL,
	"action" "monthly_period_decision_action" NOT NULL,
	"reason" text,
	"decided_at" timestamp with time zone NOT NULL,
	"previous_status" "period_status" NOT NULL,
	"next_status" "period_status" NOT NULL,
	"previous_version" integer NOT NULL,
	"next_version" integer NOT NULL,
	"monthly_snapshot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_period_decisions_actor_shape" CHECK (("monthly_period_decisions"."actor_authority" = 'CURRENT_MANAGER' and "monthly_period_decisions"."actor_employee_id" is not null) or "monthly_period_decisions"."actor_authority" = 'ORGANIZATION_HR'),
	CONSTRAINT "monthly_period_decisions_transition_shape" CHECK (("monthly_period_decisions"."action" = 'REQUEST_CHANGES' and "monthly_period_decisions"."previous_status" in ('SUBMITTED', 'APPROVED') and "monthly_period_decisions"."next_status" = 'CHANGES_REQUESTED' and length(btrim("monthly_period_decisions"."reason")) >= 10 and "monthly_period_decisions"."monthly_snapshot_id" is null) or ("monthly_period_decisions"."action" = 'APPROVE' and "monthly_period_decisions"."previous_status" = 'SUBMITTED' and "monthly_period_decisions"."next_status" = 'APPROVED' and "monthly_period_decisions"."reason" is null and "monthly_period_decisions"."monthly_snapshot_id" is not null) or ("monthly_period_decisions"."action" = 'LOCK' and "monthly_period_decisions"."previous_status" = 'APPROVED' and "monthly_period_decisions"."next_status" = 'LOCKED' and "monthly_period_decisions"."reason" is null and "monthly_period_decisions"."monthly_snapshot_id" is not null)),
	CONSTRAINT "monthly_period_decisions_version_step" CHECK ("monthly_period_decisions"."previous_version" > 0 and "monthly_period_decisions"."next_version" = "monthly_period_decisions"."previous_version" + 1)
);
--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" DROP CONSTRAINT "approved_monthly_snapshots_positive_versions";--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_destination_path";--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ALTER COLUMN "approved_by_employee_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ADD COLUMN "approval_cycle" integer;--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ADD COLUMN "approved_by_account_id" uuid;--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ADD COLUMN "approved_by_authority" "decision_actor_authority";--> statement-breakpoint

DROP TRIGGER approved_monthly_snapshots_immutable ON "approved_monthly_snapshots";--> statement-breakpoint

UPDATE "approved_monthly_snapshots" snapshot
SET "approved_by_account_id" = (
  SELECT link."user_id"
  FROM "account_employee_links" link
  WHERE link."organization_id" = snapshot."organization_id"
    AND link."employee_id" = snapshot."approved_by_employee_id"
    AND link."linked_at" <= snapshot."approved_at"
    AND (link."unlinked_at" IS NULL OR snapshot."approved_at" < link."unlinked_at")
);--> statement-breakpoint

UPDATE "approved_monthly_snapshots" snapshot
SET "approved_by_authority" = CASE
  WHEN EXISTS (
    SELECT 1
    FROM "account_role_assignments" role_assignment
    JOIN "monthly_periods" period
      ON period."organization_id" = snapshot."organization_id"
      AND period."id" = snapshot."monthly_period_id"
    JOIN "manager_assignments" manager_assignment
      ON manager_assignment."organization_id" = snapshot."organization_id"
      AND manager_assignment."employee_id" = period."employee_id"
      AND manager_assignment."manager_employee_id" = snapshot."approved_by_employee_id"
    JOIN "organizations" organization ON organization."id" = snapshot."organization_id"
    WHERE role_assignment."organization_id" = snapshot."organization_id"
      AND role_assignment."user_id" = snapshot."approved_by_account_id"
      AND role_assignment."role" = 'MANAGER'
      AND role_assignment."assigned_at" <= snapshot."approved_at"
      AND (role_assignment."revoked_at" IS NULL OR snapshot."approved_at" < role_assignment."revoked_at")
      AND manager_assignment."starts_on" <= (snapshot."approved_at" AT TIME ZONE organization."time_zone")::date
      AND (manager_assignment."ends_on" IS NULL OR (snapshot."approved_at" AT TIME ZONE organization."time_zone")::date < manager_assignment."ends_on")
  ) THEN 'CURRENT_MANAGER'::"decision_actor_authority"
  WHEN EXISTS (
    SELECT 1
    FROM "account_role_assignments" role_assignment
    WHERE role_assignment."organization_id" = snapshot."organization_id"
      AND role_assignment."user_id" = snapshot."approved_by_account_id"
      AND role_assignment."role" = 'HR_ADMINISTRATOR'
      AND role_assignment."assigned_at" <= snapshot."approved_at"
      AND (role_assignment."revoked_at" IS NULL OR snapshot."approved_at" < role_assignment."revoked_at")
  ) THEN 'ORGANIZATION_HR'::"decision_actor_authority"
END;--> statement-breakpoint

WITH numbered AS (
  SELECT "id", row_number() OVER (
    PARTITION BY "monthly_period_id"
    ORDER BY "approved_at", "id"
  )::integer AS approval_cycle
  FROM "approved_monthly_snapshots"
)
UPDATE "approved_monthly_snapshots" snapshot
SET "approval_cycle" = numbered.approval_cycle
FROM numbered
WHERE numbered."id" = snapshot."id";--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "approved_monthly_snapshots"
    WHERE "approval_cycle" IS NULL
       OR "approved_by_account_id" IS NULL
       OR "approved_by_authority" IS NULL
  ) THEN
    RAISE EXCEPTION 'monthly snapshot actor/cycle backfill is missing or ambiguous';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "approved_monthly_snapshots" ALTER COLUMN "approval_cycle" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ALTER COLUMN "approved_by_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ALTER COLUMN "approved_by_authority" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "monthly_period_decisions" ADD CONSTRAINT "monthly_period_decisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_period_decisions" ADD CONSTRAINT "monthly_period_decisions_monthly_period_id_monthly_periods_id_fk" FOREIGN KEY ("monthly_period_id") REFERENCES "public"."monthly_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_period_decisions" ADD CONSTRAINT "monthly_period_decisions_actor_account_id_auth_users_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_period_decisions" ADD CONSTRAINT "monthly_period_decisions_actor_employee_id_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_period_decisions" ADD CONSTRAINT "monthly_period_decisions_monthly_snapshot_id_approved_monthly_snapshots_id_fk" FOREIGN KEY ("monthly_snapshot_id") REFERENCES "public"."approved_monthly_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_period_decisions" ADD CONSTRAINT "monthly_period_decisions_actor_employee_organization_fk" FOREIGN KEY ("organization_id","actor_employee_id") REFERENCES "public"."employees"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_period_decisions_period_version_uidx" ON "monthly_period_decisions" USING btree ("monthly_period_id","next_version");--> statement-breakpoint
CREATE INDEX "monthly_period_decisions_period_decided_idx" ON "monthly_period_decisions" USING btree ("monthly_period_id","decided_at");--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ADD CONSTRAINT "approved_monthly_snapshots_approved_by_account_id_auth_users_id_fk" FOREIGN KEY ("approved_by_account_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ADD CONSTRAINT "approved_monthly_snapshots_approver_employee_organization_fk" FOREIGN KEY ("organization_id","approved_by_employee_id") REFERENCES "public"."employees"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "approved_monthly_snapshots_period_cycle_uidx" ON "approved_monthly_snapshots" USING btree ("monthly_period_id","approval_cycle");--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ADD CONSTRAINT "approved_monthly_snapshots_actor_shape" CHECK (("approved_monthly_snapshots"."approved_by_authority" = 'CURRENT_MANAGER' and "approved_monthly_snapshots"."approved_by_employee_id" is not null) or "approved_monthly_snapshots"."approved_by_authority" = 'ORGANIZATION_HR');--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ADD CONSTRAINT "approved_monthly_snapshots_positive_versions" CHECK ("approved_monthly_snapshots"."period_version" > 0 and "approved_monthly_snapshots"."schema_version" > 0 and "approved_monthly_snapshots"."approval_cycle" > 0);--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_destination_path" CHECK ("notifications"."destination_path" = '/requests' or "notifications"."destination_path" ~ '^/monthly-periods/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');
--> statement-breakpoint
CREATE TRIGGER approved_monthly_snapshots_immutable BEFORE UPDATE OR DELETE ON "approved_monthly_snapshots" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();--> statement-breakpoint
CREATE TRIGGER monthly_period_decisions_immutable BEFORE UPDATE OR DELETE ON "monthly_period_decisions" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
