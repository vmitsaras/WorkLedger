CREATE TABLE "entitlement_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"absence_type_id" uuid NOT NULL,
	"actor_account_id" uuid NOT NULL,
	"minutes" integer NOT NULL,
	"effective_on" date NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlement_adjustments_non_zero_minutes" CHECK ("entitlement_adjustments"."minutes" <> 0),
	CONSTRAINT "entitlement_adjustments_reason_length" CHECK (char_length(btrim("entitlement_adjustments"."reason")) between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "entitlement_adjustments" ADD CONSTRAINT "entitlement_adjustments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement_adjustments" ADD CONSTRAINT "entitlement_adjustments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement_adjustments" ADD CONSTRAINT "entitlement_adjustments_actor_account_id_auth_users_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement_adjustments" ADD CONSTRAINT "entitlement_adjustments_absence_type_organization_fk" FOREIGN KEY ("organization_id","absence_type_id") REFERENCES "public"."absence_types"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entitlement_adjustments_employee_type_date_idx" ON "entitlement_adjustments" USING btree ("employee_id","absence_type_id","effective_on");