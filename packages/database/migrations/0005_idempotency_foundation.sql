ALTER TABLE "idempotency_records" DROP CONSTRAINT "idempotency_records_terminal_shape";--> statement-breakpoint
DROP INDEX "idempotency_records_scope_command_key_uidx";--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD COLUMN "actor_account_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD COLUMN "original_http_status" integer;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_actor_account_id_auth_users_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_records_scope_key_uidx" ON "idempotency_records" USING btree ("organization_id","actor_account_id","idempotency_key_hash");--> statement-breakpoint
CREATE INDEX "idempotency_records_employee_created_idx" ON "idempotency_records" USING btree ("organization_id","employee_id","created_at");--> statement-breakpoint
ALTER TABLE "idempotency_records" DROP COLUMN "actor_scope";--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_command_allowed" CHECK ("idempotency_records"."command" in ('CLOCK_IN', 'START_BREAK', 'RESUME', 'CLOCK_OUT'));--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_terminal_shape" CHECK ((
        not "idempotency_records"."terminal"
        and "idempotency_records"."outcome" is null
        and "idempotency_records"."original_http_status" is null
        and "idempotency_records"."completed_at" is null
      ) or (
        "idempotency_records"."terminal"
        and "idempotency_records"."outcome" is not null
        and "idempotency_records"."original_http_status" between 200 and 599
        and "idempotency_records"."completed_at" is not null
      ));--> statement-breakpoint
ALTER TABLE "idempotency_records"
  ADD CONSTRAINT "idempotency_records_organization_employee_fk"
  FOREIGN KEY ("organization_id", "employee_id")
  REFERENCES "employees" ("organization_id", "id");--> statement-breakpoint
CREATE FUNCTION enforce_idempotency_record_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'idempotency records cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF OLD.terminal
    OR NOT NEW.terminal
    OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.actor_account_id IS DISTINCT FROM OLD.actor_account_id
    OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
    OR NEW.command IS DISTINCT FROM OLD.command
    OR NEW.idempotency_key_hash IS DISTINCT FROM OLD.idempotency_key_hash
    OR NEW.request_fingerprint IS DISTINCT FROM OLD.request_fingerprint
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'idempotency records allow exactly one terminal completion'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER idempotency_records_transition_guard
BEFORE UPDATE OR DELETE ON "idempotency_records"
FOR EACH ROW EXECUTE FUNCTION enforce_idempotency_record_transition();
