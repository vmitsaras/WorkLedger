-- Migration: Retention tracking and minimization audit
-- Implements WL-1007 retention profile tracking without storing removed content

CREATE TYPE retention_class AS ENUM (
  'AUTH_TRANSIENT',
  'ACCOUNT_SECURITY',
  'OPERATIONAL_LOGS',
  'NOTIFICATIONS',
  'SENSITIVE_HR',
  'DOMAIN_HISTORY',
  'TECHNICAL_AUDIT',
  'DATABASE_BACKUPS'
);

CREATE TYPE retention_behavior AS ENUM (
  'PURGE',
  'MINIMIZE',
  'RETAIN'
);

-- Retention job execution log (no removed content)
CREATE TABLE retention_job_executions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  retention_class retention_class NOT NULL,
  behavior retention_behavior NOT NULL,
  executed_at timestamp with time zone NOT NULL DEFAULT NOW(),
  cutoff_date timestamp with time zone,
  records_affected integer NOT NULL DEFAULT 0 CHECK (records_affected >= 0),
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  error_summary text,
  CONSTRAINT valid_cutoff CHECK (
    (behavior = 'RETAIN' AND cutoff_date IS NULL)
    OR (behavior IN ('PURGE', 'MINIMIZE') AND cutoff_date IS NOT NULL)
  )
);

CREATE INDEX idx_retention_job_executions_class_executed 
  ON retention_job_executions(retention_class, executed_at DESC);

-- Minimization audit facts (record that minimization occurred, not what was removed)
CREATE TABLE minimization_audit_facts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  retention_job_execution_id uuid NOT NULL REFERENCES retention_job_executions(id),
  target_table text NOT NULL,
  records_minimized integer NOT NULL CHECK (records_minimized >= 0),
  fields_cleared text[] NOT NULL,
  executed_at timestamp with time zone NOT NULL DEFAULT NOW(),
  retention_class retention_class NOT NULL,
  CONSTRAINT non_empty_fields CHECK (array_length(fields_cleared, 1) > 0)
);

CREATE INDEX idx_minimization_audit_facts_execution 
  ON minimization_audit_facts(retention_job_execution_id);
CREATE INDEX idx_minimization_audit_facts_table 
  ON minimization_audit_facts(target_table, executed_at DESC);

-- User data export requests
CREATE TABLE user_export_requests (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  requested_at timestamp with time zone NOT NULL DEFAULT NOW(),
  expires_at timestamp with time zone NOT NULL,
  include_attendance boolean NOT NULL DEFAULT true,
  include_absence boolean NOT NULL DEFAULT true,
  include_balances boolean NOT NULL DEFAULT true,
  include_requests boolean NOT NULL DEFAULT true,
  start_date date,
  end_date date,
  generated_at timestamp with time zone,
  artifact_path text,
  size_bytes bigint CHECK (size_bytes >= 0),
  CONSTRAINT valid_date_range CHECK (
    (start_date IS NULL AND end_date IS NULL)
    OR (start_date IS NOT NULL AND end_date IS NOT NULL AND start_date <= end_date)
  ),
  CONSTRAINT generated_has_path CHECK (
    (generated_at IS NULL AND artifact_path IS NULL AND size_bytes IS NULL)
    OR (generated_at IS NOT NULL AND artifact_path IS NOT NULL AND size_bytes IS NOT NULL)
  )
);

CREATE INDEX idx_user_export_requests_employee 
  ON user_export_requests(employee_id, requested_at DESC);
CREATE INDEX idx_user_export_requests_expiry 
  ON user_export_requests(expires_at) WHERE generated_at IS NOT NULL;

COMMENT ON TABLE retention_job_executions IS 
  'Retention job execution log. Records minimization actions without copying removed content per docs/06-security-operations.md section 19.';

COMMENT ON TABLE minimization_audit_facts IS 
  'Records that minimization occurred without storing what was removed. Preserves audit continuity per D-500.';

COMMENT ON TABLE user_export_requests IS 
  'Employee self-service data export requests. Exports expire and are purged per retention profile.';
