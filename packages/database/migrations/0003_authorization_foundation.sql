CREATE TYPE "public"."application_role" AS ENUM('EMPLOYEE', 'MANAGER', 'HR_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR');--> statement-breakpoint
CREATE TABLE "account_employee_links" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unlinked_at" timestamp with time zone,
	CONSTRAINT "account_employee_links_valid_interval" CHECK ("account_employee_links"."unlinked_at" is null or "account_employee_links"."linked_at" < "account_employee_links"."unlinked_at")
);
--> statement-breakpoint
CREATE TABLE "account_role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "application_role" NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "account_role_assignments_valid_interval" CHECK ("account_role_assignments"."revoked_at" is null or "account_role_assignments"."assigned_at" < "account_role_assignments"."revoked_at")
);
--> statement-breakpoint
ALTER TABLE "account_employee_links" ADD CONSTRAINT "account_employee_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_employee_links" ADD CONSTRAINT "account_employee_links_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_employee_links" ADD CONSTRAINT "account_employee_links_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_role_assignments" ADD CONSTRAINT "account_role_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_role_assignments" ADD CONSTRAINT "account_role_assignments_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_employee_links" ADD CONSTRAINT "account_employee_links_employee_organization_fk" FOREIGN KEY ("organization_id", "employee_id") REFERENCES "employees" ("organization_id", "id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_employee_links_active_user_uidx" ON "account_employee_links" USING btree ("user_id") WHERE "account_employee_links"."unlinked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "account_employee_links_active_employee_uidx" ON "account_employee_links" USING btree ("employee_id") WHERE "account_employee_links"."unlinked_at" is null;--> statement-breakpoint
CREATE INDEX "account_employee_links_organization_user_idx" ON "account_employee_links" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_role_assignments_active_role_uidx" ON "account_role_assignments" USING btree ("organization_id","user_id","role") WHERE "account_role_assignments"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "account_role_assignments_organization_user_idx" ON "account_role_assignments" USING btree ("organization_id","user_id");
