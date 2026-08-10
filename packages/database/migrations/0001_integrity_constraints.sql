CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "employment_periods" ADD CONSTRAINT "employment_periods_no_overlap" EXCLUDE USING gist ("employee_id" WITH =, daterange("starts_on", "ends_on", '[)') WITH &&);
--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_no_overlap" EXCLUDE USING gist ("employee_id" WITH =, daterange("starts_on", "ends_on", '[)') WITH &&);
--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_no_overlap" EXCLUDE USING gist ("employee_id" WITH =, daterange("starts_on", "ends_on", '[)') WITH &&);
--> statement-breakpoint
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_no_overlap" EXCLUDE USING gist ("employee_id" WITH =, daterange("starts_on", "ends_on", '[)') WITH &&);
--> statement-breakpoint
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_no_overlap" EXCLUDE USING gist ("employee_id" WITH =, daterange("starts_on", "ends_on", '[)') WITH &&);
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_identity_unique" UNIQUE ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_identity_unique" UNIQUE ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "weekly_schedules" ADD CONSTRAINT "weekly_schedules_organization_identity_unique" UNIQUE ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "time_policies" ADD CONSTRAINT "time_policies_organization_identity_unique" UNIQUE ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "absence_types" ADD CONSTRAINT "absence_types_organization_identity_unique" UNIQUE ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_organization_identity_unique" UNIQUE ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "absence_coverage_segments" ADD CONSTRAINT "absence_coverage_segments_organization_identity_unique" UNIQUE ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_organization_identity_unique" UNIQUE ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "correction_decisions" ADD CONSTRAINT "correction_decisions_organization_identity_unique" UNIQUE ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "monthly_periods" ADD CONSTRAINT "monthly_periods_organization_identity_unique" UNIQUE ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ADD CONSTRAINT "approved_monthly_snapshots_organization_identity_unique" UNIQUE ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "employment_periods" ADD CONSTRAINT "employment_periods_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_team_organization_fk" FOREIGN KEY ("organization_id", "team_id") REFERENCES "teams" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_manager_organization_fk" FOREIGN KEY ("organization_id", "manager_employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_schedule_organization_fk" FOREIGN KEY ("organization_id", "schedule_id") REFERENCES "weekly_schedules" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_policy_organization_fk" FOREIGN KEY ("organization_id", "policy_id") REFERENCES "time_policies" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "attendance_heads" ADD CONSTRAINT "attendance_heads_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "punch_events" ADD CONSTRAINT "punch_events_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "correction_decisions" ADD CONSTRAINT "correction_decisions_request_organization_fk" FOREIGN KEY ("organization_id", "correction_request_id") REFERENCES "correction_requests" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_type_organization_fk" FOREIGN KEY ("organization_id", "absence_type_id") REFERENCES "absence_types" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "absence_coverage_segments" ADD CONSTRAINT "absence_coverage_request_organization_fk" FOREIGN KEY ("organization_id", "absence_request_id") REFERENCES "absence_requests" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "daily_projections" ADD CONSTRAINT "daily_projections_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "time_account_entries" ADD CONSTRAINT "time_account_entries_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "leave_entitlement_entries" ADD CONSTRAINT "leave_entitlement_entries_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "monthly_periods" ADD CONSTRAINT "monthly_periods_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "approved_monthly_snapshots" ADD CONSTRAINT "approved_monthly_snapshots_period_organization_fk" FOREIGN KEY ("organization_id", "monthly_period_id") REFERENCES "monthly_periods" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "post_lock_adjustments" ADD CONSTRAINT "post_lock_adjustments_snapshot_organization_fk" FOREIGN KEY ("organization_id", "monthly_snapshot_id") REFERENCES "approved_monthly_snapshots" ("organization_id", "id");
--> statement-breakpoint
CREATE FUNCTION reject_immutable_record_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable WorkLedger record in table % cannot be changed', TG_TABLE_NAME USING ERRCODE = '55000'; END; $$;
--> statement-breakpoint
CREATE TRIGGER punch_events_immutable BEFORE UPDATE OR DELETE ON "punch_events" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
--> statement-breakpoint
CREATE TRIGGER correction_decisions_immutable BEFORE UPDATE OR DELETE ON "correction_decisions" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
--> statement-breakpoint
CREATE TRIGGER applied_corrections_immutable BEFORE UPDATE OR DELETE ON "applied_corrections" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
--> statement-breakpoint
CREATE TRIGGER absence_decisions_immutable BEFORE UPDATE OR DELETE ON "absence_decisions" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
--> statement-breakpoint
CREATE TRIGGER absence_effects_immutable BEFORE UPDATE OR DELETE ON "absence_effects" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
--> statement-breakpoint
CREATE TRIGGER time_account_entries_immutable BEFORE UPDATE OR DELETE ON "time_account_entries" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
--> statement-breakpoint
CREATE TRIGGER leave_entitlement_entries_immutable BEFORE UPDATE OR DELETE ON "leave_entitlement_entries" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
--> statement-breakpoint
CREATE TRIGGER approved_monthly_snapshots_immutable BEFORE UPDATE OR DELETE ON "approved_monthly_snapshots" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
--> statement-breakpoint
CREATE TRIGGER post_lock_adjustments_immutable BEFORE UPDATE OR DELETE ON "post_lock_adjustments" FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
