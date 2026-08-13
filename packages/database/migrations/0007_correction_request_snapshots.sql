ALTER TABLE "correction_requests"
  ADD COLUMN "original_interpretation" jsonb NOT NULL DEFAULT '{}'::jsonb;
