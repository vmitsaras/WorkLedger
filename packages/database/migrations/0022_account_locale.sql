ALTER TABLE "auth_users" ADD COLUMN "locale" varchar(5) DEFAULT 'en-GB' NOT NULL;
ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_locale_supported" CHECK ("auth_users"."locale" in ('en-GB', 'de-DE', 'es-ES'));
