import { sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import {
  bigint,
  boolean,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const protectedVerificationIdentifier = customType<{
  data: string;
  driverData: string;
}>({
  dataType: () => 'varchar(512)',
  toDriver: (value) => createHash('sha256').update(value, 'utf8').digest('hex'),
});

const identifier = (name: string) =>
  uuid(name)
    .default(sql`uuidv7()`)
    .notNull();
const createdAt = () =>
  timestamp('created_at', { mode: 'string', withTimezone: true }).defaultNow().notNull();
const recordedAt = () =>
  timestamp('recorded_at', { mode: 'string', withTimezone: true }).defaultNow().notNull();
const organizationId = () =>
  uuid('organization_id')
    .notNull()
    .references(() => organizations.id);
const employeeId = () =>
  uuid('employee_id')
    .notNull()
    .references(() => employees.id);

export const employeeStatus = pgEnum('employee_status', ['ACTIVE', 'INACTIVE']);
export const applicationRole = pgEnum('application_role', [
  'EMPLOYEE',
  'MANAGER',
  'HR_ADMINISTRATOR',
  'SYSTEM_ADMINISTRATOR',
]);
export const attendanceState = pgEnum('attendance_state', ['OFF_WORK', 'WORKING', 'ON_BREAK']);
export const punchEventType = pgEnum('punch_event_type', [
  'CLOCK_IN',
  'BREAK_START',
  'BREAK_END',
  'CLOCK_OUT',
]);
export const calculationStatus = pgEnum('calculation_status', [
  'PROVISIONAL',
  'INCOMPLETE',
  'COMPLETE',
]);
export const workflowStatus = pgEnum('workflow_status', [
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
]);
export const absenceRequestStatus = pgEnum('absence_request_status', [
  'SUBMITTED',
  'REPORTED',
  'ACKNOWLEDGED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
  'PARTIALLY_CANCELLED',
  'CANCELLED',
]);
export const absenceCoverageKind = pgEnum('absence_coverage_kind', [
  'FULL_DAY',
  'FIRST_HALF',
  'SECOND_HALF',
  'MINUTE_INTERVAL',
]);
export const absenceCancellationStatus = pgEnum('absence_cancellation_status', [
  'PENDING_DECISION',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
]);
export const absenceCancellationDecisionAction = pgEnum('absence_cancellation_decision_action', [
  'APPROVE',
  'REJECT',
  'REQUEST_CHANGES',
  'WITHDRAW',
]);
export const decisionAction = pgEnum('decision_action', [
  'APPROVE',
  'REJECT',
  'REQUEST_CHANGES',
  'ACKNOWLEDGE',
  'WITHDRAW',
  'CANCEL',
]);
export const decisionActorAuthority = pgEnum('decision_actor_authority', [
  'SELF',
  'CURRENT_MANAGER',
  'ORGANIZATION_HR',
]);
export const periodStatus = pgEnum('period_status', [
  'OPEN',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'LOCKED',
]);
export const timeAccountEntryType = pgEnum('time_account_entry_type', [
  'OPENING_BALANCE',
  'DAILY_DELTA',
  'DAILY_RECALCULATION_DELTA',
  'POST_LOCK_ADJUSTMENT',
  'MANUAL_ADMINISTRATIVE_ADJUSTMENT',
]);
export const ledgerActorKind = pgEnum('ledger_actor_kind', ['ACCOUNT', 'SYSTEM']);
export const auditActorKind = pgEnum('audit_actor_kind', ['ACCOUNT', 'SYSTEM']);
export const auditOutcome = pgEnum('audit_outcome', ['SUCCESS', 'DENIED', 'FAILURE']);
export const domainAuditTargetKind = pgEnum('domain_audit_target_kind', [
  'EMPLOYEE',
  'ATTENDANCE',
  'CORRECTION_REQUEST',
  'ABSENCE_REQUEST',
  'MONTHLY_PERIOD',
  'TIME_ACCOUNT',
  'LEAVE_ENTITLEMENT',
  'TEAM',
  'ASSIGNMENT',
  'CONFIGURATION',
  'EXPORT',
]);
export const securityAuditTargetKind = pgEnum('security_audit_target_kind', [
  'ACCOUNT',
  'SESSION',
  'AUTHENTICATION',
  'INVITATION',
  'RECOVERY',
  'AUTHORIZATION',
  'EXPORT',
  'OPERATIONS',
  'BACKUP',
  'SECRET',
  'NOTIFICATION_DELIVERY',
]);
export const leaveEntitlementEntryType = pgEnum('leave_entitlement_entry_type', [
  'ALLOCATION',
  'PENDING_RESERVATION',
  'RESERVATION_RELEASE',
  'APPROVED_DEDUCTION',
  'CANCELLATION_RESTORATION',
  'CARRYOVER',
  'EXPIRY',
  'MANUAL_ADJUSTMENT',
]);

export const authUsers = pgTable(
  'auth_users',
  {
    id: identifier('id').primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('auth_users_email_uidx').on(table.email),
    index('auth_users_active_idx').on(table.active),
    check('auth_users_name_not_blank', sql`length(btrim(${table.name})) > 0`),
    check('auth_users_email_normalized', sql`${table.email} = lower(${table.email})`),
  ],
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: identifier('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: varchar('user_agent', { length: 512 }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('auth_sessions_token_uidx').on(table.token),
    index('auth_sessions_user_expires_idx').on(table.userId, table.expiresAt),
    check('auth_sessions_expiry_after_creation', sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      'auth_sessions_absolute_lifetime',
      sql`${table.expiresAt} <= ${table.createdAt} + interval '12 hours'`,
    ),
  ],
);

export const authAccounts = pgTable(
  'auth_accounts',
  {
    id: identifier('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    accountId: varchar('account_id', { length: 255 }).notNull(),
    providerId: varchar('provider_id', { length: 255 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      mode: 'date',
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      mode: 'date',
      withTimezone: true,
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('auth_accounts_provider_account_uidx').on(table.providerId, table.accountId),
    index('auth_accounts_user_idx').on(table.userId),
  ],
);

export const authVerifications = pgTable(
  'auth_verifications',
  {
    id: identifier('id').primaryKey(),
    identifier: protectedVerificationIdentifier('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('auth_verifications_identifier_idx').on(table.identifier)],
);

export const authRateLimits = pgTable('auth_rate_limits', {
  key: varchar('key', { length: 512 }).primaryKey(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
});

export const organizations = pgTable(
  'organizations',
  {
    id: identifier('id').primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    timeZone: varchar('time_zone', { length: 255 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [check('organizations_name_not_blank', sql`length(btrim(${table.name})) > 0`)],
);

export const employees = pgTable(
  'employees',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    employeeNumber: varchar('employee_number', { length: 64 }).notNull(),
    displayName: varchar('display_name', { length: 160 }).notNull(),
    status: employeeStatus('status').default('ACTIVE').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('employees_organization_employee_number_uidx').on(
      table.organizationId,
      table.employeeNumber,
    ),
    index('employees_organization_status_idx').on(table.organizationId, table.status),
    check('employees_display_name_not_blank', sql`length(btrim(${table.displayName})) > 0`),
  ],
);

export const employmentPeriods = pgTable(
  'employment_periods',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    employeeId: employeeId(),
    startsOn: date('starts_on', { mode: 'string' }).notNull(),
    endsOn: date('ends_on', { mode: 'string' }),
    createdAt: createdAt(),
  },
  (table) => [
    index('employment_periods_employee_dates_idx').on(
      table.employeeId,
      table.startsOn,
      table.endsOn,
    ),
    check(
      'employment_periods_valid_range',
      sql`${table.endsOn} is null or ${table.startsOn} < ${table.endsOn}`,
    ),
  ],
);

export const accountEmployeeLinks = pgTable(
  'account_employee_links',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id),
    employeeId: employeeId(),
    linkedAt: timestamp('linked_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
    unlinkedAt: timestamp('unlinked_at', { mode: 'date', withTimezone: true }),
  },
  (table) => [
    uniqueIndex('account_employee_links_active_user_uidx')
      .on(table.userId)
      .where(sql`${table.unlinkedAt} is null`),
    uniqueIndex('account_employee_links_active_employee_uidx')
      .on(table.employeeId)
      .where(sql`${table.unlinkedAt} is null`),
    index('account_employee_links_organization_user_idx').on(table.organizationId, table.userId),
    check(
      'account_employee_links_valid_interval',
      sql`${table.unlinkedAt} is null or ${table.linkedAt} < ${table.unlinkedAt}`,
    ),
  ],
);

export const accountRoleAssignments = pgTable(
  'account_role_assignments',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id),
    role: applicationRole('role').notNull(),
    assignedAt: timestamp('assigned_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp('revoked_at', { mode: 'date', withTimezone: true }),
  },
  (table) => [
    uniqueIndex('account_role_assignments_active_role_uidx')
      .on(table.organizationId, table.userId, table.role)
      .where(sql`${table.revokedAt} is null`),
    index('account_role_assignments_organization_user_idx').on(table.organizationId, table.userId),
    check(
      'account_role_assignments_valid_interval',
      sql`${table.revokedAt} is null or ${table.assignedAt} < ${table.revokedAt}`,
    ),
  ],
);

export const teams = pgTable(
  'teams',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    name: varchar('name', { length: 160 }).notNull(),
    active: boolean('active').default(true).notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('teams_organization_name_uidx').on(table.organizationId, table.name)],
);

export const teamAssignments = pgTable(
  'team_assignments',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    employeeId: employeeId(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id),
    startsOn: date('starts_on', { mode: 'string' }).notNull(),
    endsOn: date('ends_on', { mode: 'string' }),
    createdAt: createdAt(),
  },
  (table) => [
    index('team_assignments_employee_dates_idx').on(table.employeeId, table.startsOn, table.endsOn),
    check(
      'team_assignments_valid_range',
      sql`${table.endsOn} is null or ${table.startsOn} < ${table.endsOn}`,
    ),
  ],
);

export const managerAssignments = pgTable(
  'manager_assignments',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    employeeId: employeeId(),
    managerEmployeeId: uuid('manager_employee_id')
      .notNull()
      .references(() => employees.id),
    startsOn: date('starts_on', { mode: 'string' }).notNull(),
    endsOn: date('ends_on', { mode: 'string' }),
    createdAt: createdAt(),
  },
  (table) => [
    index('manager_assignments_employee_dates_idx').on(
      table.employeeId,
      table.startsOn,
      table.endsOn,
    ),
    index('manager_assignments_manager_dates_idx').on(
      table.managerEmployeeId,
      table.startsOn,
      table.endsOn,
    ),
    check('manager_assignments_not_self', sql`${table.employeeId} <> ${table.managerEmployeeId}`),
    check(
      'manager_assignments_valid_range',
      sql`${table.endsOn} is null or ${table.startsOn} < ${table.endsOn}`,
    ),
  ],
);

export const weeklySchedules = pgTable(
  'weekly_schedules',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    name: varchar('name', { length: 160 }).notNull(),
    version: integer('version').notNull(),
    mondayMinutes: integer('monday_minutes').notNull(),
    tuesdayMinutes: integer('tuesday_minutes').notNull(),
    wednesdayMinutes: integer('wednesday_minutes').notNull(),
    thursdayMinutes: integer('thursday_minutes').notNull(),
    fridayMinutes: integer('friday_minutes').notNull(),
    saturdayMinutes: integer('saturday_minutes').notNull(),
    sundayMinutes: integer('sunday_minutes').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('weekly_schedules_organization_name_version_uidx').on(
      table.organizationId,
      table.name,
      table.version,
    ),
    check('weekly_schedules_positive_version', sql`${table.version} > 0`),
    check(
      'weekly_schedules_minutes_bounds',
      sql`${table.mondayMinutes} between 0 and 1440 and ${table.tuesdayMinutes} between 0 and 1440 and ${table.wednesdayMinutes} between 0 and 1440 and ${table.thursdayMinutes} between 0 and 1440 and ${table.fridayMinutes} between 0 and 1440 and ${table.saturdayMinutes} between 0 and 1440 and ${table.sundayMinutes} between 0 and 1440`,
    ),
  ],
);

export const scheduleAssignments = pgTable(
  'schedule_assignments',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    employeeId: employeeId(),
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => weeklySchedules.id),
    startsOn: date('starts_on', { mode: 'string' }).notNull(),
    endsOn: date('ends_on', { mode: 'string' }),
    createdAt: createdAt(),
  },
  (table) => [
    index('schedule_assignments_employee_dates_idx').on(
      table.employeeId,
      table.startsOn,
      table.endsOn,
    ),
    check(
      'schedule_assignments_valid_range',
      sql`${table.endsOn} is null or ${table.startsOn} < ${table.endsOn}`,
    ),
  ],
);

export const timePolicies = pgTable(
  'time_policies',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    name: varchar('name', { length: 160 }).notNull(),
    version: integer('version').notNull(),
    rules: jsonb('rules').$type<Readonly<Record<string, unknown>>>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('time_policies_organization_name_version_uidx').on(
      table.organizationId,
      table.name,
      table.version,
    ),
    check('time_policies_positive_version', sql`${table.version} > 0`),
    check('time_policies_rules_object', sql`jsonb_typeof(${table.rules}) = 'object'`),
  ],
);

export const policyAssignments = pgTable(
  'policy_assignments',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    employeeId: employeeId(),
    policyId: uuid('policy_id')
      .notNull()
      .references(() => timePolicies.id),
    startsOn: date('starts_on', { mode: 'string' }).notNull(),
    endsOn: date('ends_on', { mode: 'string' }),
    createdAt: createdAt(),
  },
  (table) => [
    index('policy_assignments_employee_dates_idx').on(
      table.employeeId,
      table.startsOn,
      table.endsOn,
    ),
    check(
      'policy_assignments_valid_range',
      sql`${table.endsOn} is null or ${table.startsOn} < ${table.endsOn}`,
    ),
  ],
);

export const holidays = pgTable(
  'holidays',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    holidayDate: date('holiday_date', { mode: 'string' }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('holidays_organization_date_uidx').on(table.organizationId, table.holidayDate),
  ],
);

export const attendanceHeads = pgTable(
  'attendance_heads',
  {
    employeeId: employeeId().primaryKey(),
    organizationId: organizationId(),
    state: attendanceState('state').default('OFF_WORK').notNull(),
    attendanceRevision: integer('attendance_revision').default(0).notNull(),
    nextEventSequence: integer('next_event_sequence').default(1).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check('attendance_heads_non_negative_revision', sql`${table.attendanceRevision} >= 0`),
    check('attendance_heads_positive_next_sequence', sql`${table.nextEventSequence} > 0`),
  ],
);

export const punchEvents = pgTable(
  'punch_events',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    employeeId: employeeId(),
    eventSequence: integer('event_sequence').notNull(),
    eventType: punchEventType('event_type').notNull(),
    occurredAt: timestamp('occurred_at', { mode: 'string', withTimezone: true }).notNull(),
    recordedAt: recordedAt(),
    actorEmployeeId: uuid('actor_employee_id').references(() => employees.id),
    commandId: uuid('command_id').notNull(),
  },
  (table) => [
    uniqueIndex('punch_events_employee_sequence_uidx').on(table.employeeId, table.eventSequence),
    index('punch_events_employee_occurred_idx').on(table.employeeId, table.occurredAt),
    uniqueIndex('punch_events_employee_command_sequence_uidx').on(
      table.employeeId,
      table.commandId,
      table.eventSequence,
    ),
    check('punch_events_positive_sequence', sql`${table.eventSequence} > 0`),
  ],
);

export const correctionRequests = pgTable(
  'correction_requests',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    employeeId: employeeId(),
    requestedByEmployeeId: uuid('requested_by_employee_id')
      .notNull()
      .references(() => employees.id),
    localDate: date('local_date', { mode: 'string' }).notNull(),
    status: workflowStatus('status').default('SUBMITTED').notNull(),
    reason: text('reason').notNull(),
    originalInterpretation: jsonb('original_interpretation')
      .$type<Readonly<Record<string, unknown>>>()
      .notNull(),
    proposedInterpretation: jsonb('proposed_interpretation')
      .$type<Readonly<Record<string, unknown>>>()
      .notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('correction_requests_employee_date_status_idx').on(
      table.employeeId,
      table.localDate,
      table.status,
    ),
    check('correction_requests_reason_not_blank', sql`length(btrim(${table.reason})) > 0`),
    check('correction_requests_positive_version', sql`${table.version} > 0`),
  ],
);

export const correctionDecisions = pgTable(
  'correction_decisions',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    correctionRequestId: uuid('correction_request_id')
      .notNull()
      .references(() => correctionRequests.id),
    actorAccountId: uuid('actor_account_id')
      .notNull()
      .references(() => authUsers.id),
    actorEmployeeId: uuid('actor_employee_id').references(() => employees.id),
    actorAuthority: decisionActorAuthority('actor_authority').notNull(),
    action: decisionAction('action').notNull(),
    reason: text('reason'),
    decidedAt: timestamp('decided_at', { mode: 'string', withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('correction_decisions_request_decided_idx').on(
      table.correctionRequestId,
      table.decidedAt,
    ),
    foreignKey({
      columns: [table.organizationId, table.actorEmployeeId],
      foreignColumns: [employees.organizationId, employees.id],
      name: 'correction_decisions_actor_employee_organization_fk',
    }),
    check(
      'correction_decisions_reviewer_authority',
      sql`${table.actorAuthority} in ('CURRENT_MANAGER', 'ORGANIZATION_HR')`,
    ),
  ],
);

export const appliedCorrections = pgTable(
  'applied_corrections',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    correctionRequestId: uuid('correction_request_id')
      .notNull()
      .references(() => correctionRequests.id),
    correctionDecisionId: uuid('correction_decision_id')
      .notNull()
      .references(() => correctionDecisions.id),
    employeeId: employeeId(),
    localDate: date('local_date', { mode: 'string' }).notNull(),
    version: integer('version').notNull(),
    interpretation: jsonb('interpretation').$type<Readonly<Record<string, unknown>>>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('applied_corrections_request_version_uidx').on(
      table.correctionRequestId,
      table.version,
    ),
    index('applied_corrections_employee_date_idx').on(table.employeeId, table.localDate),
    check('applied_corrections_positive_version', sql`${table.version} > 0`),
  ],
);

export const absenceTypes = pgTable(
  'absence_types',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    version: integer('version').notNull(),
    active: boolean('active').default(true).notNull(),
    validFrom: date('valid_from', { mode: 'string' }).notNull(),
    validTo: date('valid_to', { mode: 'string' }),
    policy: jsonb('policy').$type<Readonly<Record<string, unknown>>>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('absence_types_organization_code_version_uidx').on(
      table.organizationId,
      table.code,
      table.version,
    ),
    uniqueIndex('absence_types_organization_id_uidx').on(table.organizationId, table.id),
    check('absence_types_positive_version', sql`${table.version} > 0`),
    check(
      'absence_types_valid_date_range',
      sql`${table.validTo} is null or ${table.validFrom} < ${table.validTo}`,
    ),
  ],
);

export const absenceRequests = pgTable(
  'absence_requests',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    employeeId: employeeId(),
    absenceTypeId: uuid('absence_type_id')
      .notNull()
      .references(() => absenceTypes.id),
    requestedByEmployeeId: uuid('requested_by_employee_id')
      .notNull()
      .references(() => employees.id),
    status: absenceRequestStatus('status').notNull(),
    version: integer('version').default(1).notNull(),
    submittedAt: timestamp('submitted_at', { mode: 'string', withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('absence_requests_employee_status_submitted_idx').on(
      table.employeeId,
      table.status,
      table.submittedAt,
    ),
    check('absence_requests_positive_version', sql`${table.version} > 0`),
  ],
);

export const absenceCoverageSegments = pgTable(
  'absence_coverage_segments',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    absenceRequestId: uuid('absence_request_id')
      .notNull()
      .references(() => absenceRequests.id),
    localDate: date('local_date', { mode: 'string' }).notNull(),
    kind: absenceCoverageKind('kind').notNull(),
    startsAtMinute: integer('starts_at_minute'),
    endsAtMinute: integer('ends_at_minute'),
    createdAt: createdAt(),
  },
  (table) => [
    index('absence_coverage_request_date_idx').on(table.absenceRequestId, table.localDate),
    check(
      'absence_coverage_minute_shape',
      sql`(${table.kind} = 'MINUTE_INTERVAL' and ${table.startsAtMinute} between 0 and 1439 and ${table.endsAtMinute} between 1 and 1440 and ${table.startsAtMinute} < ${table.endsAtMinute}) or (${table.kind} <> 'MINUTE_INTERVAL' and ${table.startsAtMinute} is null and ${table.endsAtMinute} is null)`,
    ),
  ],
);

export const absenceDecisions = pgTable(
  'absence_decisions',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    absenceRequestId: uuid('absence_request_id')
      .notNull()
      .references(() => absenceRequests.id),
    actorAccountId: uuid('actor_account_id')
      .notNull()
      .references(() => authUsers.id),
    actorEmployeeId: uuid('actor_employee_id').references(() => employees.id),
    actorAuthority: decisionActorAuthority('actor_authority').notNull(),
    action: decisionAction('action').notNull(),
    reason: text('reason'),
    decidedAt: timestamp('decided_at', { mode: 'string', withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('absence_decisions_request_decided_idx').on(table.absenceRequestId, table.decidedAt),
    foreignKey({
      columns: [table.organizationId, table.actorEmployeeId],
      foreignColumns: [employees.organizationId, employees.id],
      name: 'absence_decisions_actor_employee_organization_fk',
    }),
    check(
      'absence_decisions_reviewer_authority',
      sql`${table.actorAuthority} in ('CURRENT_MANAGER', 'ORGANIZATION_HR')`,
    ),
  ],
);

/** Immutable cancellation workflow records; original absence coverage is never deleted or edited. */
export const absenceCancellations = pgTable(
  'absence_cancellations',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    absenceRequestId: uuid('absence_request_id')
      .notNull()
      .references(() => absenceRequests.id),
    employeeId: employeeId(),
    requestedByEmployeeId: uuid('requested_by_employee_id')
      .notNull()
      .references(() => employees.id),
    status: absenceCancellationStatus('status').notNull(),
    version: integer('version').default(1).notNull(),
    submittedAt: timestamp('submitted_at', { mode: 'string', withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('absence_cancellations_request_status_idx').on(table.absenceRequestId, table.status),
    index('absence_cancellations_employee_status_idx').on(table.employeeId, table.status),
    check('absence_cancellations_positive_version', sql`${table.version} > 0`),
  ],
);

export const absenceCancellationSegments = pgTable(
  'absence_cancellation_segments',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    absenceCancellationId: uuid('absence_cancellation_id')
      .notNull()
      .references(() => absenceCancellations.id),
    absenceCoverageSegmentId: uuid('absence_coverage_segment_id')
      .notNull()
      .references(() => absenceCoverageSegments.id),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('absence_cancellation_segments_cancellation_coverage_uidx').on(
      table.absenceCancellationId,
      table.absenceCoverageSegmentId,
    ),
    index('absence_cancellation_segments_coverage_idx').on(table.absenceCoverageSegmentId),
  ],
);

export const absenceCancellationDecisions = pgTable(
  'absence_cancellation_decisions',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    absenceCancellationId: uuid('absence_cancellation_id')
      .notNull()
      .references(() => absenceCancellations.id),
    actorAccountId: uuid('actor_account_id')
      .notNull()
      .references(() => authUsers.id),
    actorEmployeeId: uuid('actor_employee_id').references(() => employees.id),
    actorAuthority: decisionActorAuthority('actor_authority').notNull(),
    action: absenceCancellationDecisionAction('action').notNull(),
    reason: text('reason'),
    decidedAt: timestamp('decided_at', { mode: 'string', withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('absence_cancellation_decisions_cancellation_decided_idx').on(
      table.absenceCancellationId,
      table.decidedAt,
    ),
    foreignKey({
      columns: [table.organizationId, table.actorEmployeeId],
      foreignColumns: [employees.organizationId, employees.id],
      name: 'absence_cancellation_decisions_actor_employee_organization_fk',
    }),
    check(
      'absence_cancellation_decisions_actor_shape',
      sql`(${table.action} = 'WITHDRAW' and ${table.actorAuthority} = 'SELF' and ${table.actorEmployeeId} is not null) or (${table.action} <> 'WITHDRAW' and ${table.actorAuthority} in ('CURRENT_MANAGER', 'ORGANIZATION_HR'))`,
    ),
  ],
);

export const absenceEffects = pgTable(
  'absence_effects',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    absenceRequestId: uuid('absence_request_id')
      .notNull()
      .references(() => absenceRequests.id),
    absenceCoverageSegmentId: uuid('absence_coverage_segment_id')
      .notNull()
      .references(() => absenceCoverageSegments.id),
    sourceDecisionId: uuid('source_decision_id').references(() => absenceDecisions.id),
    employeeId: employeeId(),
    localDate: date('local_date', { mode: 'string' }).notNull(),
    expectedReductionMinutes: integer('expected_reduction_minutes').notNull(),
    creditMinutes: integer('credit_minutes').notNull(),
    entitlementMinutes: integer('entitlement_minutes').notNull(),
    effectVersion: integer('effect_version').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('absence_effects_segment_version_uidx').on(
      table.absenceCoverageSegmentId,
      table.effectVersion,
    ),
    index('absence_effects_employee_date_idx').on(table.employeeId, table.localDate),
    check(
      'absence_effects_non_negative_minutes',
      sql`${table.expectedReductionMinutes} >= 0 and ${table.creditMinutes} >= 0 and ${table.entitlementMinutes} >= 0`,
    ),
    check('absence_effects_positive_version', sql`${table.effectVersion} > 0`),
  ],
);

export const dailyProjections = pgTable(
  'daily_projections',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    employeeId: employeeId(),
    localDate: date('local_date', { mode: 'string' }).notNull(),
    calculationStatus: calculationStatus('calculation_status').notNull(),
    projectionVersion: integer('projection_version').notNull(),
    engineVersion: varchar('engine_version', { length: 64 }).notNull(),
    sourceFingerprint: varchar('source_fingerprint', { length: 64 }).notNull(),
    expectedMinutes: integer('expected_minutes').notNull(),
    workedMinutes: integer('worked_minutes').notNull(),
    breakMinutes: integer('break_minutes').notNull(),
    absenceCreditMinutes: integer('absence_credit_minutes').notNull(),
    adjustmentMinutes: integer('adjustment_minutes').notNull(),
    creditedMinutes: integer('credited_minutes').notNull(),
    balanceMinutes: integer('balance_minutes').notNull(),
    warningCodes: jsonb('warning_codes')
      .$type<readonly string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    sourceReferences: jsonb('source_references')
      .$type<Readonly<Record<string, unknown>>>()
      .notNull(),
    calculatedAt: timestamp('calculated_at', { mode: 'string', withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('daily_projections_employee_date_uidx').on(table.employeeId, table.localDate),
    index('daily_projections_organization_date_status_idx').on(
      table.organizationId,
      table.localDate,
      table.calculationStatus,
    ),
    check('daily_projections_positive_version', sql`${table.projectionVersion} > 0`),
    check('daily_projections_fingerprint_hex', sql`${table.sourceFingerprint} ~ '^[0-9a-f]{64}$'`),
    check(
      'daily_projections_non_negative_base_minutes',
      sql`${table.expectedMinutes} >= 0 and ${table.workedMinutes} >= 0 and ${table.breakMinutes} >= 0 and ${table.absenceCreditMinutes} >= 0`,
    ),
    check(
      'daily_projections_credited_reconciles',
      sql`${table.creditedMinutes} = ${table.workedMinutes} + ${table.absenceCreditMinutes} + ${table.adjustmentMinutes}`,
    ),
    check(
      'daily_projections_balance_reconciles',
      sql`${table.balanceMinutes} = ${table.creditedMinutes} - ${table.expectedMinutes}`,
    ),
    check(
      'daily_projections_warning_codes_array',
      sql`jsonb_typeof(${table.warningCodes}) = 'array'`,
    ),
    check(
      'daily_projections_sources_object',
      sql`jsonb_typeof(${table.sourceReferences}) = 'object'`,
    ),
  ],
);

export const timeAccountEntries = pgTable(
  'time_account_entries',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    employeeId: employeeId(),
    localDate: date('local_date', { mode: 'string' }).notNull(),
    entryType: timeAccountEntryType('entry_type').notNull(),
    minutes: integer('minutes').notNull(),
    sourceId: uuid('source_id').notNull(),
    sourceFingerprint: varchar('source_fingerprint', { length: 64 }).notNull(),
    actorKind: ledgerActorKind('actor_kind').notNull(),
    actorId: varchar('actor_id', { length: 128 }).notNull(),
    explanationCode: varchar('explanation_code', { length: 128 }).notNull(),
    postedAt: timestamp('posted_at', { mode: 'string', withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('time_account_entries_employee_source_uidx').on(table.employeeId, table.sourceId),
    index('time_account_entries_employee_date_idx').on(table.employeeId, table.localDate),
    check('time_account_entries_actor_id_not_blank', sql`length(btrim(${table.actorId})) > 0`),
    check(
      'time_account_entries_explanation_not_blank',
      sql`length(btrim(${table.explanationCode})) > 0`,
    ),
    check(
      'time_account_entries_non_zero_minutes',
      sql`${table.minutes} <> 0 or ${table.entryType} in ('OPENING_BALANCE', 'DAILY_DELTA')`,
    ),
    check(
      'time_account_entries_fingerprint_hex',
      sql`${table.sourceFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const leaveEntitlementEntries = pgTable(
  'leave_entitlement_entries',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    employeeId: employeeId(),
    absenceTypeId: uuid('absence_type_id')
      .notNull()
      .references(() => absenceTypes.id),
    entryType: leaveEntitlementEntryType('entry_type').notNull(),
    minutes: integer('minutes').notNull(),
    sourceId: uuid('source_id').notNull(),
    effectiveOn: date('effective_on', { mode: 'string' }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('leave_entitlement_entries_employee_type_source_uidx').on(
      table.employeeId,
      table.absenceTypeId,
      table.entryType,
      table.sourceId,
    ),
    index('leave_entitlement_entries_employee_type_date_idx').on(
      table.employeeId,
      table.absenceTypeId,
      table.effectiveOn,
    ),
    foreignKey({
      columns: [table.organizationId, table.absenceTypeId],
      foreignColumns: [absenceTypes.organizationId, absenceTypes.id],
      name: 'leave_entitlement_entries_absence_type_organization_fk',
    }),
  ],
);

export const monthlyPeriods = pgTable(
  'monthly_periods',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    employeeId: employeeId(),
    monthStart: date('month_start', { mode: 'string' }).notNull(),
    status: periodStatus('status').default('OPEN').notNull(),
    version: integer('version').default(1).notNull(),
    submittedAt: timestamp('submitted_at', { mode: 'string', withTimezone: true }),
    approvedAt: timestamp('approved_at', { mode: 'string', withTimezone: true }),
    lockedAt: timestamp('locked_at', { mode: 'string', withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('monthly_periods_employee_month_uidx').on(table.employeeId, table.monthStart),
    index('monthly_periods_organization_status_month_idx').on(
      table.organizationId,
      table.status,
      table.monthStart,
    ),
    check('monthly_periods_first_day', sql`extract(day from ${table.monthStart}) = 1`),
    check('monthly_periods_positive_version', sql`${table.version} > 0`),
    check(
      'monthly_periods_lock_shape',
      sql`${table.status} <> 'LOCKED' or ${table.lockedAt} is not null`,
    ),
  ],
);

export const approvedMonthlySnapshots = pgTable(
  'approved_monthly_snapshots',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    monthlyPeriodId: uuid('monthly_period_id')
      .notNull()
      .references(() => monthlyPeriods.id),
    periodVersion: integer('period_version').notNull(),
    schemaVersion: integer('schema_version').notNull(),
    engineVersion: varchar('engine_version', { length: 64 }).notNull(),
    sourceFingerprint: varchar('source_fingerprint', { length: 64 }).notNull(),
    snapshotFingerprint: varchar('snapshot_fingerprint', { length: 64 }).notNull(),
    approvedByEmployeeId: uuid('approved_by_employee_id')
      .notNull()
      .references(() => employees.id),
    approvedAt: timestamp('approved_at', { mode: 'string', withTimezone: true }).notNull(),
    snapshot: jsonb('snapshot').$type<Readonly<Record<string, unknown>>>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('approved_monthly_snapshots_period_version_uidx').on(
      table.monthlyPeriodId,
      table.periodVersion,
    ),
    check(
      'approved_monthly_snapshots_positive_versions',
      sql`${table.periodVersion} > 0 and ${table.schemaVersion} > 0`,
    ),
    check(
      'approved_monthly_snapshots_source_fingerprint_hex',
      sql`${table.sourceFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'approved_monthly_snapshots_snapshot_fingerprint_hex',
      sql`${table.snapshotFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check('approved_monthly_snapshots_object', sql`jsonb_typeof(${table.snapshot}) = 'object'`),
  ],
);

export const postLockAdjustments = pgTable(
  'post_lock_adjustments',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    monthlySnapshotId: uuid('monthly_snapshot_id')
      .notNull()
      .references(() => approvedMonthlySnapshots.id),
    employeeId: employeeId(),
    sourceId: uuid('source_id').notNull(),
    localDate: date('local_date', { mode: 'string' }).notNull(),
    minutes: integer('minutes').notNull(),
    reason: text('reason').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('post_lock_adjustments_snapshot_source_uidx').on(
      table.monthlySnapshotId,
      table.sourceId,
    ),
    index('post_lock_adjustments_employee_date_idx').on(table.employeeId, table.localDate),
    check('post_lock_adjustments_non_zero_minutes', sql`${table.minutes} <> 0`),
    check('post_lock_adjustments_reason_not_blank', sql`length(btrim(${table.reason})) > 0`),
  ],
);

export const idempotencyRecords = pgTable(
  'idempotency_records',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    actorAccountId: uuid('actor_account_id')
      .notNull()
      .references(() => authUsers.id),
    employeeId: employeeId(),
    command: varchar('command', { length: 80 }).notNull(),
    idempotencyKeyHash: varchar('idempotency_key_hash', { length: 64 }).notNull(),
    requestFingerprint: varchar('request_fingerprint', { length: 64 }).notNull(),
    outcome: jsonb('outcome').$type<unknown>(),
    originalHttpStatus: integer('original_http_status'),
    terminal: boolean('terminal').default(false).notNull(),
    createdAt: createdAt(),
    completedAt: timestamp('completed_at', { mode: 'string', withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idempotency_records_scope_key_uidx').on(
      table.organizationId,
      table.actorAccountId,
      table.idempotencyKeyHash,
    ),
    index('idempotency_records_employee_created_idx').on(
      table.organizationId,
      table.employeeId,
      table.createdAt,
    ),
    check(
      'idempotency_records_command_allowed',
      sql`${table.command} in ('CLOCK_IN', 'START_BREAK', 'RESUME', 'CLOCK_OUT')`,
    ),
    check('idempotency_records_key_hash_hex', sql`${table.idempotencyKeyHash} ~ '^[0-9a-f]{64}$'`),
    check(
      'idempotency_records_request_fingerprint_hex',
      sql`${table.requestFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'idempotency_records_terminal_shape',
      sql`(
        not ${table.terminal}
        and ${table.outcome} is null
        and ${table.originalHttpStatus} is null
        and ${table.completedAt} is null
      ) or (
        ${table.terminal}
        and ${table.outcome} is not null
        and ${table.originalHttpStatus} between 200 and 599
        and ${table.completedAt} is not null
      )`,
    ),
  ],
);

export const domainAuditEvents = pgTable(
  'domain_audit_events',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    actorKind: auditActorKind('actor_kind').notNull(),
    actorAccountId: uuid('actor_account_id').references(() => authUsers.id),
    actorSystemProcess: varchar('actor_system_process', { length: 128 }),
    actorRole: applicationRole('actor_role'),
    actionCode: varchar('action_code', { length: 80 }).notNull(),
    outcome: auditOutcome('outcome').notNull(),
    subjectEmployeeId: uuid('subject_employee_id').references(() => employees.id),
    targetKind: domainAuditTargetKind('target_kind').notNull(),
    targetId: varchar('target_id', { length: 160 }).notNull(),
    reasonCode: varchar('reason_code', { length: 80 }),
    restrictedReasonId: uuid('restricted_reason_id'),
    facts: jsonb('facts').$type<Readonly<Record<string, unknown>>>().default({}).notNull(),
    requestId: uuid('request_id'),
    privileged: boolean('privileged').default(false).notNull(),
    occurredAt: timestamp('occurred_at', { mode: 'string', withTimezone: true }).notNull(),
  },
  (table) => [
    index('domain_audit_events_organization_time_idx').on(
      table.organizationId,
      table.occurredAt,
      table.id,
    ),
    index('domain_audit_events_employee_time_idx').on(
      table.organizationId,
      table.subjectEmployeeId,
      table.occurredAt,
      table.id,
    ),
    check(
      'domain_audit_events_actor_shape',
      sql`(${table.actorKind} = 'ACCOUNT' and ${table.actorAccountId} is not null and ${table.actorSystemProcess} is null) or (${table.actorKind} = 'SYSTEM' and ${table.actorAccountId} is null and ${table.actorSystemProcess} is not null and ${table.actorRole} is null)`,
    ),
    check(
      'domain_audit_events_action_code_token',
      sql`${table.actionCode} ~ '^[A-Z][A-Z0-9_]{0,79}$'`,
    ),
    check(
      'domain_audit_events_target_id_token',
      sql`${table.targetId} ~ '^[A-Za-z0-9][A-Za-z0-9._:~-]{0,159}$'`,
    ),
    check(
      'domain_audit_events_reason_code_token',
      sql`${table.reasonCode} is null or ${table.reasonCode} ~ '^[A-Z][A-Z0-9_]{0,79}$'`,
    ),
    check('domain_audit_events_facts_object', sql`jsonb_typeof(${table.facts}) = 'object'`),
    check('domain_audit_events_facts_size', sql`octet_length(${table.facts}::text) <= 4096`),
  ],
);

export const securityAuditEvents = pgTable(
  'security_audit_events',
  {
    id: identifier('id').primaryKey(),
    organizationId: organizationId(),
    actorKind: auditActorKind('actor_kind').notNull(),
    actorAccountId: uuid('actor_account_id').references(() => authUsers.id),
    actorSystemProcess: varchar('actor_system_process', { length: 128 }),
    actorRole: applicationRole('actor_role'),
    actionCode: varchar('action_code', { length: 80 }).notNull(),
    outcome: auditOutcome('outcome').notNull(),
    targetAccountId: uuid('target_account_id').references(() => authUsers.id),
    targetKind: securityAuditTargetKind('target_kind').notNull(),
    targetId: varchar('target_id', { length: 160 }).notNull(),
    reasonCode: varchar('reason_code', { length: 80 }),
    facts: jsonb('facts').$type<Readonly<Record<string, unknown>>>().default({}).notNull(),
    requestId: uuid('request_id'),
    privileged: boolean('privileged').default(false).notNull(),
    occurredAt: timestamp('occurred_at', { mode: 'string', withTimezone: true }).notNull(),
  },
  (table) => [
    index('security_audit_events_organization_time_idx').on(
      table.organizationId,
      table.occurredAt,
      table.id,
    ),
    index('security_audit_events_account_time_idx').on(
      table.organizationId,
      table.targetAccountId,
      table.occurredAt,
      table.id,
    ),
    check(
      'security_audit_events_actor_shape',
      sql`(${table.actorKind} = 'ACCOUNT' and ${table.actorAccountId} is not null and ${table.actorSystemProcess} is null) or (${table.actorKind} = 'SYSTEM' and ${table.actorAccountId} is null and ${table.actorSystemProcess} is not null and ${table.actorRole} is null)`,
    ),
    check(
      'security_audit_events_action_code_token',
      sql`${table.actionCode} ~ '^[A-Z][A-Z0-9_]{0,79}$'`,
    ),
    check(
      'security_audit_events_target_id_token',
      sql`${table.targetId} ~ '^[A-Za-z0-9][A-Za-z0-9._:~-]{0,159}$'`,
    ),
    check(
      'security_audit_events_reason_code_token',
      sql`${table.reasonCode} is null or ${table.reasonCode} ~ '^[A-Z][A-Z0-9_]{0,79}$'`,
    ),
    check('security_audit_events_facts_object', sql`jsonb_typeof(${table.facts}) = 'object'`),
    check('security_audit_events_facts_size', sql`octet_length(${table.facts}::text) <= 4096`),
  ],
);
