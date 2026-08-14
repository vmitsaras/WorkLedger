CREATE TYPE "public"."decision_actor_authority" AS ENUM('SELF', 'CURRENT_MANAGER', 'ORGANIZATION_HR');--> statement-breakpoint
ALTER TABLE "absence_cancellation_decisions" ADD COLUMN "actor_account_id" uuid;--> statement-breakpoint
ALTER TABLE "absence_cancellation_decisions" ADD COLUMN "actor_authority" "decision_actor_authority";--> statement-breakpoint
ALTER TABLE "absence_decisions" ADD COLUMN "actor_account_id" uuid;--> statement-breakpoint
ALTER TABLE "absence_decisions" ADD COLUMN "actor_authority" "decision_actor_authority";--> statement-breakpoint
ALTER TABLE "correction_decisions" ADD COLUMN "actor_account_id" uuid;--> statement-breakpoint
ALTER TABLE "correction_decisions" ADD COLUMN "actor_authority" "decision_actor_authority";--> statement-breakpoint

DROP TRIGGER correction_decisions_immutable ON "correction_decisions";--> statement-breakpoint
DROP TRIGGER absence_decisions_immutable ON "absence_decisions";--> statement-breakpoint

UPDATE "correction_decisions" decision
SET "actor_account_id" = (
  SELECT link."user_id"
  FROM "account_employee_links" link
  WHERE link."organization_id" = decision."organization_id"
    AND link."employee_id" = decision."actor_employee_id"
    AND link."linked_at" <= decision."decided_at"
    AND (link."unlinked_at" IS NULL OR decision."decided_at" < link."unlinked_at")
);--> statement-breakpoint
UPDATE "absence_decisions" decision
SET "actor_account_id" = (
  SELECT link."user_id"
  FROM "account_employee_links" link
  WHERE link."organization_id" = decision."organization_id"
    AND link."employee_id" = decision."actor_employee_id"
    AND link."linked_at" <= decision."decided_at"
    AND (link."unlinked_at" IS NULL OR decision."decided_at" < link."unlinked_at")
);--> statement-breakpoint
UPDATE "absence_cancellation_decisions" decision
SET "actor_account_id" = (
  SELECT link."user_id"
  FROM "account_employee_links" link
  WHERE link."organization_id" = decision."organization_id"
    AND link."employee_id" = decision."actor_employee_id"
    AND link."linked_at" <= decision."decided_at"
    AND (link."unlinked_at" IS NULL OR decision."decided_at" < link."unlinked_at")
);--> statement-breakpoint

UPDATE "correction_decisions" decision
SET "actor_authority" = CASE
  WHEN EXISTS (
    SELECT 1
    FROM "account_role_assignments" role_assignment
    JOIN "manager_assignments" manager_assignment
      ON manager_assignment."organization_id" = decision."organization_id"
      AND manager_assignment."manager_employee_id" = decision."actor_employee_id"
    JOIN "correction_requests" request
      ON request."organization_id" = decision."organization_id"
      AND request."id" = decision."correction_request_id"
      AND request."employee_id" = manager_assignment."employee_id"
    JOIN "organizations" organization ON organization."id" = decision."organization_id"
    WHERE role_assignment."organization_id" = decision."organization_id"
      AND role_assignment."user_id" = decision."actor_account_id"
      AND role_assignment."role" = 'MANAGER'
      AND role_assignment."assigned_at" <= decision."decided_at"
      AND (role_assignment."revoked_at" IS NULL OR decision."decided_at" < role_assignment."revoked_at")
      AND manager_assignment."starts_on" <= (decision."decided_at" AT TIME ZONE organization."time_zone")::date
      AND (manager_assignment."ends_on" IS NULL OR (decision."decided_at" AT TIME ZONE organization."time_zone")::date < manager_assignment."ends_on")
  ) THEN 'CURRENT_MANAGER'::"decision_actor_authority"
  WHEN EXISTS (
    SELECT 1 FROM "account_role_assignments" role_assignment
    WHERE role_assignment."organization_id" = decision."organization_id"
      AND role_assignment."user_id" = decision."actor_account_id"
      AND role_assignment."role" = 'HR_ADMINISTRATOR'
      AND role_assignment."assigned_at" <= decision."decided_at"
      AND (role_assignment."revoked_at" IS NULL OR decision."decided_at" < role_assignment."revoked_at")
  ) THEN 'ORGANIZATION_HR'::"decision_actor_authority"
END;--> statement-breakpoint

UPDATE "absence_decisions" decision
SET "actor_authority" = CASE
  WHEN EXISTS (
    SELECT 1
    FROM "account_role_assignments" role_assignment
    JOIN "manager_assignments" manager_assignment
      ON manager_assignment."organization_id" = decision."organization_id"
      AND manager_assignment."manager_employee_id" = decision."actor_employee_id"
    JOIN "absence_requests" request
      ON request."organization_id" = decision."organization_id"
      AND request."id" = decision."absence_request_id"
      AND request."employee_id" = manager_assignment."employee_id"
    JOIN "organizations" organization ON organization."id" = decision."organization_id"
    WHERE role_assignment."organization_id" = decision."organization_id"
      AND role_assignment."user_id" = decision."actor_account_id"
      AND role_assignment."role" = 'MANAGER'
      AND role_assignment."assigned_at" <= decision."decided_at"
      AND (role_assignment."revoked_at" IS NULL OR decision."decided_at" < role_assignment."revoked_at")
      AND manager_assignment."starts_on" <= (decision."decided_at" AT TIME ZONE organization."time_zone")::date
      AND (manager_assignment."ends_on" IS NULL OR (decision."decided_at" AT TIME ZONE organization."time_zone")::date < manager_assignment."ends_on")
  ) THEN 'CURRENT_MANAGER'::"decision_actor_authority"
  WHEN EXISTS (
    SELECT 1 FROM "account_role_assignments" role_assignment
    WHERE role_assignment."organization_id" = decision."organization_id"
      AND role_assignment."user_id" = decision."actor_account_id"
      AND role_assignment."role" = 'HR_ADMINISTRATOR'
      AND role_assignment."assigned_at" <= decision."decided_at"
      AND (role_assignment."revoked_at" IS NULL OR decision."decided_at" < role_assignment."revoked_at")
  ) THEN 'ORGANIZATION_HR'::"decision_actor_authority"
END;--> statement-breakpoint

UPDATE "absence_cancellation_decisions" decision
SET "actor_authority" = CASE
  WHEN decision."action" = 'WITHDRAW' THEN 'SELF'::"decision_actor_authority"
  WHEN EXISTS (
    SELECT 1
    FROM "account_role_assignments" role_assignment
    JOIN "manager_assignments" manager_assignment
      ON manager_assignment."organization_id" = decision."organization_id"
      AND manager_assignment."manager_employee_id" = decision."actor_employee_id"
    JOIN "absence_cancellations" cancellation
      ON cancellation."organization_id" = decision."organization_id"
      AND cancellation."id" = decision."absence_cancellation_id"
      AND cancellation."employee_id" = manager_assignment."employee_id"
    JOIN "organizations" organization ON organization."id" = decision."organization_id"
    WHERE role_assignment."organization_id" = decision."organization_id"
      AND role_assignment."user_id" = decision."actor_account_id"
      AND role_assignment."role" = 'MANAGER'
      AND role_assignment."assigned_at" <= decision."decided_at"
      AND (role_assignment."revoked_at" IS NULL OR decision."decided_at" < role_assignment."revoked_at")
      AND manager_assignment."starts_on" <= (decision."decided_at" AT TIME ZONE organization."time_zone")::date
      AND (manager_assignment."ends_on" IS NULL OR (decision."decided_at" AT TIME ZONE organization."time_zone")::date < manager_assignment."ends_on")
  ) THEN 'CURRENT_MANAGER'::"decision_actor_authority"
  WHEN EXISTS (
    SELECT 1 FROM "account_role_assignments" role_assignment
    WHERE role_assignment."organization_id" = decision."organization_id"
      AND role_assignment."user_id" = decision."actor_account_id"
      AND role_assignment."role" = 'HR_ADMINISTRATOR'
      AND role_assignment."assigned_at" <= decision."decided_at"
      AND (role_assignment."revoked_at" IS NULL OR decision."decided_at" < role_assignment."revoked_at")
  ) THEN 'ORGANIZATION_HR'::"decision_actor_authority"
END;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "correction_decisions" WHERE "actor_account_id" IS NULL OR "actor_authority" IS NULL
    UNION ALL
    SELECT 1 FROM "absence_decisions" WHERE "actor_account_id" IS NULL OR "actor_authority" IS NULL
    UNION ALL
    SELECT 1 FROM "absence_cancellation_decisions" WHERE "actor_account_id" IS NULL OR "actor_authority" IS NULL
  ) THEN
    RAISE EXCEPTION 'decision actor backfill is missing or ambiguous';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "absence_cancellation_decisions" ALTER COLUMN "actor_employee_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "absence_decisions" ALTER COLUMN "actor_employee_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "correction_decisions" ALTER COLUMN "actor_employee_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "absence_cancellation_decisions" ALTER COLUMN "actor_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "absence_cancellation_decisions" ALTER COLUMN "actor_authority" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "absence_decisions" ALTER COLUMN "actor_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "absence_decisions" ALTER COLUMN "actor_authority" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "correction_decisions" ALTER COLUMN "actor_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "correction_decisions" ALTER COLUMN "actor_authority" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "absence_cancellation_decisions" ADD CONSTRAINT "absence_cancellation_decisions_actor_account_id_auth_users_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_cancellation_decisions" ADD CONSTRAINT "absence_cancellation_decisions_actor_employee_organization_fk" FOREIGN KEY ("organization_id","actor_employee_id") REFERENCES "public"."employees"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_decisions" ADD CONSTRAINT "absence_decisions_actor_account_id_auth_users_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_decisions" ADD CONSTRAINT "absence_decisions_actor_employee_organization_fk" FOREIGN KEY ("organization_id","actor_employee_id") REFERENCES "public"."employees"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_decisions" ADD CONSTRAINT "correction_decisions_actor_account_id_auth_users_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_decisions" ADD CONSTRAINT "correction_decisions_actor_employee_organization_fk" FOREIGN KEY ("organization_id","actor_employee_id") REFERENCES "public"."employees"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_cancellation_decisions" ADD CONSTRAINT "absence_cancellation_decisions_actor_shape" CHECK (("absence_cancellation_decisions"."action" = 'WITHDRAW' and "absence_cancellation_decisions"."actor_authority" = 'SELF' and "absence_cancellation_decisions"."actor_employee_id" is not null) or ("absence_cancellation_decisions"."action" <> 'WITHDRAW' and "absence_cancellation_decisions"."actor_authority" in ('CURRENT_MANAGER', 'ORGANIZATION_HR')));--> statement-breakpoint
ALTER TABLE "absence_decisions" ADD CONSTRAINT "absence_decisions_reviewer_authority" CHECK ("absence_decisions"."actor_authority" in ('CURRENT_MANAGER', 'ORGANIZATION_HR'));--> statement-breakpoint
ALTER TABLE "correction_decisions" ADD CONSTRAINT "correction_decisions_reviewer_authority" CHECK ("correction_decisions"."actor_authority" in ('CURRENT_MANAGER', 'ORGANIZATION_HR'));--> statement-breakpoint

CREATE TRIGGER correction_decisions_immutable BEFORE UPDATE OR DELETE ON "correction_decisions" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();--> statement-breakpoint
CREATE TRIGGER absence_decisions_immutable BEFORE UPDATE OR DELETE ON "absence_decisions" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();--> statement-breakpoint
CREATE TRIGGER absence_cancellation_decisions_immutable BEFORE UPDATE OR DELETE ON "absence_cancellation_decisions" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
