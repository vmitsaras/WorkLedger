import {
  approvalDecisionEnvelopeSchema,
  absenceSettingsAdminDetailEnvelopeSchema,
  holidayImpactPreviewAdminEnvelopeSchema,
  holidaySettingsAdminDetailEnvelopeSchema,
  employeeEntitlementAdminDetailEnvelopeSchema,
  approvalDetailEnvelopeSchema,
  approvalInboxEnvelopeSchema,
  applyCorrectionEnvelopeSchema,
  apiErrorEnvelopeSchema,
  clockInEnvelopeSchema,
  clockOutEnvelopeSchema,
  csrfBootstrapEnvelopeSchema,
  dailyTimeRecordEnvelopeSchema,
  correctionDecisionEnvelopeSchema,
  correctionReviewQueueEnvelopeSchema,
  submittedAbsenceCancellationEnvelopeSchema,
  submitCorrectionRequestEnvelopeSchema,
  submittedSicknessReportEnvelopeSchema,
  submittedVacationRequestEnvelopeSchema,
  resumeAttendanceEnvelopeSchema,
  revokeSelfSessionEnvelopeSchema,
  selfContextEnvelopeSchema,
  selfProfileEnvelopeSchema,
  startBreakEnvelopeSchema,
  teamStatusEnvelopeSchema,
  teamCalendarEnvelopeSchema,
  todayAttendanceEnvelopeSchema,
  myTimeEnvelopeSchema,
  notificationHistoryEnvelopeSchema,
  monthlyPeriodEnvelopeSchema,
  reportCatalogEnvelopeSchema,
  reportResultEnvelopeSchema,
  dismissedNotificationEnvelopeSchema,
  personalCalendarEnvelopeSchema,
  type ApiErrorCode,
  type ApprovalInbox,
  type AbsenceSettingsAdminDetail,
  type CreateHolidayAdminRequest,
  type HolidayImpactPreviewAdmin,
  type HolidayImpactPreviewAdminRequest,
  type HolidaySettingsAdminDetail,
  type CreateAbsenceTypeVersionAdminRequest,
  type CreateEntitlementAdjustmentAdminRequest,
  type EmployeeEntitlementAdminDetail,
  type ApprovalInboxQuery,
  type ApprovalDecisionRequest,
  type ApprovalDecisionResult,
  type ApprovalDetail,
  type ApiFieldErrors,
  type ApiRecoveryContext,
  type AttendanceCommand,
  type AttendanceCommandResult,
  type DailyTimeRecord,
  type SelfContext,
  type SelfProfile,
  type TodayAttendance,
  type MyTime,
  type MyTimeQuery,
  type PersonalCalendar,
  type PersonalCalendarQuery,
  type NotificationHistory,
  type MonthlyPeriod,
  type MonthlyPeriodLockRequest,
  type MonthlyPeriodReviewRequest,
  type MonthlyPeriodSubmissionRequest,
  type NotificationQuery,
  type ReportCatalog,
  type ReportExportRequest,
  type ReportKey,
  type ReportQuery,
  type ReportResult,
  type DismissedNotification,
  type SubmitCorrectionRequest,
  type SubmitSicknessReport,
  type SubmitVacationRequest,
  type SubmittedSicknessReport,
  type SubmittedCorrectionRequest,
  type SubmittedVacationRequest,
  type CorrectionDecisionRequest,
  type CorrectionReviewItem,
  type SubmitAbsenceCancellation,
  type TeamStatus,
  type TeamCalendar,
  type TeamCalendarQuery,
  administrationActionEnvelopeSchema,
  employeeAdminDetailEnvelopeSchema,
  employeeAdminPageEnvelopeSchema,
  employeeAssignmentAdminDetailEnvelopeSchema,
  invitationActivationEnvelopeSchema,
  systemAccountPageEnvelopeSchema,
  teamAdminPageEnvelopeSchema,
  employeeScheduleAdminDetailEnvelopeSchema,
  employeePolicyAdminDetailEnvelopeSchema,
  timeSettingsAdminDetailEnvelopeSchema,
  type ActivateEmployeeAdminRequest,
  type AdministrationActionResult,
  type CreateEmployeeAdminRequest,
  type CreateTeamAdminRequest,
  type CreateTechnicalAccountRequest,
  type DeactivateEmployeeAdminRequest,
  type EmployeeAdminDetail,
  type EmployeeAdminPage,
  type EmployeeAdminQuery,
  type EmployeeAssignmentAdminDetail,
  type ReplaceManagerAssignmentRequest,
  type ReplaceEmployeeRolesRequest,
  type ReplaceTeamAssignmentRequest,
  type SystemAccountPage,
  type SystemAccountQuery,
  type TeamAdminPage,
  type TeamAdminQuery,
  type CreateScheduleVersionAdminRequest,
  type CreateTimePolicyVersionAdminRequest,
  type EmployeePolicyAdminDetail,
  type EmployeeScheduleAdminDetail,
  type ReplaceScheduleAssignmentAdminRequest,
  type ReplacePolicyAssignmentAdminRequest,
  type TimeSettingsAdminDetail,
} from '@workledger/contracts';

export class ApiClientError extends Error {
  constructor(
    readonly code: ApiErrorCode | 'AUTH_PASSWORD_POLICY_REJECTED' | 'DEPENDENCY_FAILURE',
    readonly status: number,
    readonly requestId?: string,
    readonly context?: ApiRecoveryContext,
    readonly idempotentReplay?: boolean,
    readonly fields?: ApiFieldErrors,
  ) {
    super(code);
    this.name = 'ApiClientError';
  }
}

let csrfToken: string | null = null;

export async function loadSelfContext(): Promise<SelfContext> {
  const body = await requestJson('/v1/me/context');
  const parsed = selfContextEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadSelfProfile(): Promise<SelfProfile> {
  const body = await requestJson('/v1/me/profile');
  const parsed = selfProfileEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadEmployeeAdminPage(
  query: EmployeeAdminQuery,
  signal?: AbortSignal,
): Promise<EmployeeAdminPage> {
  const search = new URLSearchParams({
    limit: query.limit.toString(),
    page: query.page.toString(),
    status: query.status,
  });
  const body = await requestJson(
    `/v1/hr/employees?${search}`,
    signal === undefined ? {} : { signal },
  );
  const parsed = employeeAdminPageEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadEmployeeAdminDetail(
  employeeId: string,
  signal?: AbortSignal,
): Promise<EmployeeAdminDetail> {
  const body = await requestJson(
    `/v1/hr/employees/${encodeURIComponent(employeeId)}`,
    signal === undefined ? {} : { signal },
  );
  const parsed = employeeAdminDetailEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadSystemAccountPage(
  query: SystemAccountQuery,
  signal?: AbortSignal,
): Promise<SystemAccountPage> {
  const search = new URLSearchParams({
    limit: query.limit.toString(),
    page: query.page.toString(),
  });
  const body = await requestJson(
    `/v1/system/accounts?${search}`,
    signal === undefined ? {} : { signal },
  );
  const parsed = systemAccountPageEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadTodayAttendance(signal?: AbortSignal): Promise<TodayAttendance> {
  const body = await requestJson('/v1/me/attendance/today', signal === undefined ? {} : { signal });
  const parsed = todayAttendanceEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadMyTime(query: MyTimeQuery, signal?: AbortSignal): Promise<MyTime> {
  const search = new URLSearchParams({
    date: query.date,
    limit: query.limit.toString(),
    page: query.page.toString(),
    view: query.view,
  });
  const body = await requestJson(
    `/v1/me/time?${search.toString()}`,
    signal === undefined ? {} : { signal },
  );
  const parsed = myTimeEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadPersonalCalendar(
  query: PersonalCalendarQuery,
  signal?: AbortSignal,
): Promise<PersonalCalendar> {
  const search = new URLSearchParams();
  if (query.month !== undefined) search.set('month', query.month);
  const suffix = search.size === 0 ? '' : `?${search.toString()}`;
  const body = await requestJson(
    `/v1/me/calendar${suffix}`,
    signal === undefined ? {} : { signal },
  );
  const parsed = personalCalendarEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadNotificationHistory(
  query: NotificationQuery,
  signal?: AbortSignal,
): Promise<NotificationHistory> {
  const search = new URLSearchParams({
    limit: query.limit.toString(),
    page: query.page.toString(),
  });
  const body = await requestJson(
    `/v1/me/notifications?${search.toString()}`,
    signal === undefined ? {} : { signal },
  );
  const parsed = notificationHistoryEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function dismissNotification(notificationId: string): Promise<DismissedNotification> {
  const token = await getCsrfToken();
  const body = await requestJson(
    `/v1/me/notifications/${encodeURIComponent(notificationId)}/dismiss`,
    {
      headers: { 'x-workledger-csrf': token },
      method: 'POST',
    },
  );
  const parsed = dismissedNotificationEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadDailyTimeRecord(
  recordId: string,
  signal?: AbortSignal,
): Promise<DailyTimeRecord> {
  const body = await requestJson(
    `/v1/me/time-records/${encodeURIComponent(recordId)}`,
    signal === undefined ? {} : { signal },
  );
  const parsed = dailyTimeRecordEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadMonthlyPeriod(
  periodId: string,
  signal?: AbortSignal,
): Promise<MonthlyPeriod> {
  const body = await requestJson(
    `/v1/monthly-periods/${encodeURIComponent(periodId)}`,
    signal === undefined ? {} : { signal },
  );
  const parsed = monthlyPeriodEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadReportCatalog(signal?: AbortSignal): Promise<ReportCatalog> {
  const body = await requestJson('/v1/reports', signal === undefined ? {} : { signal });
  const parsed = reportCatalogEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadReport(
  reportKey: ReportKey,
  query: ReportQuery,
  signal?: AbortSignal,
): Promise<ReportResult> {
  const search = new URLSearchParams({
    direction: query.direction,
    from: query.from,
    limit: query.limit.toString(),
    page: query.page.toString(),
    sort: query.sort,
    to: query.to,
  });
  if (query.employeeId !== undefined) search.set('employeeId', query.employeeId);
  const body = await requestJson(
    `/v1/reports/${encodeURIComponent(reportKey)}?${search.toString()}`,
    signal === undefined ? {} : { signal },
  );
  const parsed = reportResultEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export type ReportCsvDownload = Readonly<{
  blob: Blob;
  filename: string;
}>;

export async function exportReportCsv(
  reportKey: ReportKey,
  query: ReportExportRequest,
): Promise<ReportCsvDownload> {
  const token = await getCsrfToken();
  let response: Response;
  try {
    response = await fetch(`/v1/reports/${encodeURIComponent(reportKey)}/export`, {
      body: JSON.stringify(query),
      credentials: 'same-origin',
      headers: {
        accept: 'text/csv',
        'content-type': 'application/json',
        'x-workledger-csrf': token,
      },
      method: 'POST',
    });
  } catch {
    throw new ApiClientError('DEPENDENCY_FAILURE', 0);
  }
  if (!response.ok) {
    const body = await safeJson(response);
    const parsedError = apiErrorEnvelopeSchema.safeParse(body);
    throw new ApiClientError(
      parsedError.success ? parsedError.data.error.code : 'DEPENDENCY_FAILURE',
      response.status,
      parsedError.success ? parsedError.data.error.requestId : undefined,
      parsedError.success ? parsedError.data.error.context : undefined,
      parsedError.success ? parsedError.data.meta?.idempotentReplay : undefined,
      parsedError.success ? parsedError.data.error.fields : undefined,
    );
  }
  const expectedFilename = reportExportFilename(reportKey, query.from, query.to);
  if (
    response.headers.get('content-type')?.toLocaleLowerCase() !== 'text/csv; charset=utf-8' ||
    response.headers.get('content-disposition') !== `attachment; filename="${expectedFilename}"`
  ) {
    throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  }
  return Object.freeze({ blob: await response.blob(), filename: expectedFilename });
}

export async function submitMonthlyPeriod(
  periodId: string,
  input: MonthlyPeriodSubmissionRequest,
): Promise<MonthlyPeriod> {
  const token = await getCsrfToken();
  const body = await requestJson(`/v1/monthly-periods/${encodeURIComponent(periodId)}/submit`, {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json', 'x-workledger-csrf': token },
    method: 'POST',
  });
  const parsed = monthlyPeriodEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function reviewMonthlyPeriod(
  periodId: string,
  input: MonthlyPeriodReviewRequest,
): Promise<MonthlyPeriod> {
  return mutateMonthlyPeriod(periodId, 'review', input);
}

export async function lockMonthlyPeriod(
  periodId: string,
  input: MonthlyPeriodLockRequest,
): Promise<MonthlyPeriod> {
  return mutateMonthlyPeriod(periodId, 'lock', input);
}

async function mutateMonthlyPeriod(
  periodId: string,
  action: 'lock' | 'review',
  input: MonthlyPeriodLockRequest | MonthlyPeriodReviewRequest,
): Promise<MonthlyPeriod> {
  const token = await getCsrfToken();
  const body = await requestJson(`/v1/monthly-periods/${encodeURIComponent(periodId)}/${action}`, {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json', 'x-workledger-csrf': token },
    method: 'POST',
  });
  const parsed = monthlyPeriodEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function submitCorrectionRequest(
  input: SubmitCorrectionRequest,
): Promise<SubmittedCorrectionRequest> {
  const token = await getCsrfToken();
  const body = await requestJson('/v1/me/correction-requests', {
    body: JSON.stringify(input),
    headers: {
      'content-type': 'application/json',
      'x-workledger-csrf': token,
    },
    method: 'POST',
  });
  const parsed = submitCorrectionRequestEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function submitVacationRequest(
  input: SubmitVacationRequest,
): Promise<SubmittedVacationRequest> {
  const token = await getCsrfToken();
  const body = await requestJson('/v1/me/vacation-requests', {
    body: JSON.stringify(input),
    headers: {
      'content-type': 'application/json',
      'x-workledger-csrf': token,
    },
    method: 'POST',
  });
  const parsed = submittedVacationRequestEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function submitSicknessReport(
  input: SubmitSicknessReport,
): Promise<SubmittedSicknessReport> {
  const token = await getCsrfToken();
  const body = await requestJson('/v1/me/sickness-reports', {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json', 'x-workledger-csrf': token },
    method: 'POST',
  });
  const parsed = submittedSicknessReportEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function submitAbsenceCancellation(
  requestId: string,
  input: SubmitAbsenceCancellation,
) {
  const token = await getCsrfToken();
  const body = await requestJson(
    `/v1/me/absence-requests/${encodeURIComponent(requestId)}/cancellations`,
    {
      body: JSON.stringify(input),
      headers: { 'content-type': 'application/json', 'x-workledger-csrf': token },
      method: 'POST',
    },
  );
  const parsed = submittedAbsenceCancellationEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadManagerCorrectionQueue(
  signal?: AbortSignal,
): Promise<readonly CorrectionReviewItem[]> {
  const body = await requestJson(
    '/v1/manager/correction-requests',
    signal === undefined ? {} : { signal },
  );
  const parsed = correctionReviewQueueEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data.items;
}

export async function loadApprovalInbox(
  query: ApprovalInboxQuery,
  signal?: AbortSignal,
): Promise<ApprovalInbox> {
  const search = new URLSearchParams({
    direction: query.direction,
    limit: query.limit.toString(),
    page: query.page.toString(),
    sort: query.sort,
    status: query.status,
    type: query.type,
  });
  if (query.from !== undefined) search.set('from', query.from);
  if (query.team !== undefined) search.set('team', query.team);
  if (query.to !== undefined) search.set('to', query.to);
  const body = await requestJson(
    `/v1/approvals?${search.toString()}`,
    signal === undefined ? {} : { signal },
  );
  const parsed = approvalInboxEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadApprovalDetail(
  approvalId: string,
  signal?: AbortSignal,
): Promise<ApprovalDetail> {
  const body = await requestJson(
    `/v1/approvals/${encodeURIComponent(approvalId)}`,
    signal === undefined ? {} : { signal },
  );
  const parsed = approvalDetailEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadTeamStatus(signal?: AbortSignal): Promise<TeamStatus> {
  const body = await requestJson('/v1/team/status', signal === undefined ? {} : { signal });
  const parsed = teamStatusEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadTeamCalendar(
  query: TeamCalendarQuery,
  signal?: AbortSignal,
): Promise<TeamCalendar> {
  const search = new URLSearchParams();
  if (query.month !== undefined) search.set('month', query.month);
  const suffix = search.size === 0 ? '' : `?${search.toString()}`;
  const body = await requestJson(
    `/v1/team/calendar${suffix}`,
    signal === undefined ? {} : { signal },
  );
  const parsed = teamCalendarEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function decideApproval(
  approvalId: string,
  input: ApprovalDecisionRequest,
): Promise<ApprovalDecisionResult> {
  const token = await getCsrfToken();
  const body = await requestJson(`/v1/approvals/${encodeURIComponent(approvalId)}/decision`, {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json', 'x-workledger-csrf': token },
    method: 'POST',
  });
  const parsed = approvalDecisionEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function decideManagerCorrectionRequest(
  requestId: string,
  input: CorrectionDecisionRequest,
) {
  const token = await getCsrfToken();
  const body = await requestJson(
    `/v1/manager/correction-requests/${encodeURIComponent(requestId)}/decision`,
    {
      body: JSON.stringify(input),
      headers: { 'content-type': 'application/json', 'x-workledger-csrf': token },
      method: 'POST',
    },
  );
  const parsed = correctionDecisionEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function applyApprovedCorrectionRequest(requestId: string, expectedVersion: number) {
  const token = await getCsrfToken();
  const body = await requestJson(
    `/v1/manager/correction-requests/${encodeURIComponent(requestId)}/apply`,
    {
      body: JSON.stringify({ expectedVersion }),
      headers: { 'content-type': 'application/json', 'x-workledger-csrf': token },
      method: 'POST',
    },
  );
  const parsed = applyCorrectionEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

type SimpleAttendanceIntent = Readonly<{
  command: Exclude<AttendanceCommand, 'CLOCK_OUT'>;
  expectedAttendanceRevision: number;
  idempotencyKey: string;
}>;

type ClockOutAttendanceIntent = Readonly<{
  command: 'CLOCK_OUT';
  confirmActiveBreak?: boolean;
  expectedAttendanceRevision: number;
  idempotencyKey: string;
}>;

export type AttendanceCommandIntent = SimpleAttendanceIntent | ClockOutAttendanceIntent;

const ATTENDANCE_COMMAND_PATHS: Readonly<Record<AttendanceCommand, string>> = Object.freeze({
  CLOCK_IN: '/v1/me/attendance/clock-in',
  CLOCK_OUT: '/v1/me/attendance/clock-out',
  RESUME: '/v1/me/attendance/end-break',
  START_BREAK: '/v1/me/attendance/start-break',
});

export async function executeAttendanceCommand(
  intent: AttendanceCommandIntent,
): Promise<AttendanceCommandResult> {
  const token = await getCsrfToken();
  const requestBody =
    intent.command === 'CLOCK_OUT'
      ? {
          ...(intent.confirmActiveBreak === undefined
            ? {}
            : { confirmActiveBreak: intent.confirmActiveBreak }),
          expectedAttendanceRevision: intent.expectedAttendanceRevision,
        }
      : { expectedAttendanceRevision: intent.expectedAttendanceRevision };
  const body = await requestJson(ATTENDANCE_COMMAND_PATHS[intent.command], {
    body: JSON.stringify(requestBody),
    headers: {
      'content-type': 'application/json',
      'idempotency-key': intent.idempotencyKey,
      'x-workledger-csrf': token,
    },
    method: 'POST',
  });
  switch (intent.command) {
    case 'CLOCK_IN':
      return parseAttendanceEnvelope(clockInEnvelopeSchema.safeParse(body), intent.command);
    case 'START_BREAK':
      return parseAttendanceEnvelope(startBreakEnvelopeSchema.safeParse(body), intent.command);
    case 'RESUME':
      return parseAttendanceEnvelope(
        resumeAttendanceEnvelopeSchema.safeParse(body),
        intent.command,
      );
    case 'CLOCK_OUT':
      return parseAttendanceEnvelope(clockOutEnvelopeSchema.safeParse(body), intent.command);
  }
}

export function createAttendanceIntentKey(): string {
  return globalThis.crypto.randomUUID();
}

function parseAttendanceEnvelope(
  parsed: Readonly<
    { success: false } | { success: true; data: Readonly<{ data: AttendanceCommandResult }> }
  >,
  command: AttendanceCommand,
): AttendanceCommandResult {
  if (!parsed.success || parsed.data.data.command !== command) {
    throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  }
  return parsed.data.data;
}

export async function signIn(email: string, password: string): Promise<void> {
  const response = await fetch('/api/auth/sign-in/email', {
    body: JSON.stringify({ email, password, rememberMe: false }),
    credentials: 'same-origin',
    headers: jsonHeaders(),
    method: 'POST',
  });
  if (response.ok) return;
  throw new ApiClientError(
    response.status === 429 ? 'RATE_LIMITED' : 'AUTH_INVALID_CREDENTIALS',
    response.status,
  );
}

export async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch('/api/auth/request-password-reset', {
    body: JSON.stringify({ email }),
    credentials: 'same-origin',
    headers: jsonHeaders(),
    method: 'POST',
  });
  if (response.ok) return;
  throw new ApiClientError(
    response.status === 429 ? 'RATE_LIMITED' : 'DEPENDENCY_FAILURE',
    response.status,
  );
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const response = await fetch('/api/auth/reset-password', {
    body: JSON.stringify({ newPassword, token }),
    credentials: 'same-origin',
    headers: jsonHeaders(),
    method: 'POST',
  });
  if (response.ok) return;
  const body = await safeJson(response);
  if (isErrorCodeRecord(body) && body.code === 'PASSWORD_POLICY_REJECTED') {
    throw new ApiClientError('AUTH_PASSWORD_POLICY_REJECTED', response.status);
  }
  throw new ApiClientError(
    response.status === 429 ? 'RATE_LIMITED' : 'AUTH_RESET_INVALID_OR_EXPIRED',
    response.status,
  );
}

export async function activateAccountInvitation(token: string, password: string): Promise<void> {
  const body = await requestJson('/v1/account-invitations/activate', {
    body: JSON.stringify({ password, token }),
    headers: jsonHeaders(),
    method: 'POST',
  });
  const parsed = invitationActivationEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
}

export async function createEmployeeForAdministration(
  input: CreateEmployeeAdminRequest,
): Promise<EmployeeAdminDetail> {
  const body = await administrationMutation('/v1/hr/employees', input);
  const parsed = employeeAdminDetailEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadEmployeeAssignmentAdminDetail(
  employeeId: string,
  signal?: AbortSignal,
): Promise<EmployeeAssignmentAdminDetail> {
  const body = await requestJson(
    `/v1/hr/employees/${encodeURIComponent(employeeId)}/assignments`,
    signal === undefined ? {} : { signal },
  );
  const parsed = employeeAssignmentAdminDetailEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadEmployeeScheduleAdminDetail(
  employeeId: string,
  signal?: AbortSignal,
): Promise<EmployeeScheduleAdminDetail> {
  const body = await requestJson(
    `/v1/hr/employees/${encodeURIComponent(employeeId)}/schedule`,
    signal === undefined ? {} : { signal },
  );
  const parsed = employeeScheduleAdminDetailEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadEmployeePolicyAdminDetail(
  employeeId: string,
  signal?: AbortSignal,
): Promise<EmployeePolicyAdminDetail> {
  const body = await requestJson(
    `/v1/hr/employees/${encodeURIComponent(employeeId)}/policy`,
    signal === undefined ? {} : { signal },
  );
  const parsed = employeePolicyAdminDetailEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadAbsenceSettingsAdminDetail(
  signal?: AbortSignal,
): Promise<AbsenceSettingsAdminDetail> {
  const body = await requestJson('/v1/hr/absence-settings', signal === undefined ? {} : { signal });
  const parsed = absenceSettingsAdminDetailEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadHolidaySettingsAdminDetail(
  signal?: AbortSignal,
): Promise<HolidaySettingsAdminDetail> {
  const body = await requestJson('/v1/hr/holiday-settings', signal === undefined ? {} : { signal });
  const parsed = holidaySettingsAdminDetailEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function previewHolidayImpactForAdministration(
  input: HolidayImpactPreviewAdminRequest,
): Promise<HolidayImpactPreviewAdmin> {
  const body = await administrationMutation('/v1/hr/holiday-settings/impact-preview', input);
  const parsed = holidayImpactPreviewAdminEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadEmployeeEntitlementAdminDetail(
  employeeId: string,
  signal?: AbortSignal,
): Promise<EmployeeEntitlementAdminDetail> {
  const body = await requestJson(
    `/v1/hr/employees/${encodeURIComponent(employeeId)}/entitlements`,
    signal === undefined ? {} : { signal },
  );
  const parsed = employeeEntitlementAdminDetailEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadTimeSettingsAdminDetail(
  signal?: AbortSignal,
): Promise<TimeSettingsAdminDetail> {
  const body = await requestJson('/v1/hr/time-settings', signal === undefined ? {} : { signal });
  const parsed = timeSettingsAdminDetailEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function loadTeamAdminPage(
  query: TeamAdminQuery,
  signal?: AbortSignal,
): Promise<TeamAdminPage> {
  const search = new URLSearchParams({
    limit: query.limit.toString(),
    page: query.page.toString(),
    status: query.status,
  });
  const body = await requestJson(`/v1/hr/teams?${search}`, signal === undefined ? {} : { signal });
  const parsed = teamAdminPageEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export async function activateEmployeeForAdministration(
  employeeId: string,
  input: ActivateEmployeeAdminRequest,
): Promise<AdministrationActionResult> {
  return administrationAction(`/v1/hr/employees/${encodeURIComponent(employeeId)}/activate`, input);
}

export async function deactivateEmployeeForAdministration(
  employeeId: string,
  input: DeactivateEmployeeAdminRequest,
): Promise<AdministrationActionResult> {
  return administrationAction(
    `/v1/hr/employees/${encodeURIComponent(employeeId)}/deactivate`,
    input,
  );
}

export async function replaceEmployeeRolesForAdministration(
  employeeId: string,
  input: ReplaceEmployeeRolesRequest,
): Promise<AdministrationActionResult> {
  return administrationAction(`/v1/hr/employees/${encodeURIComponent(employeeId)}/roles`, input);
}

export async function reissueEmployeeInvitation(
  employeeId: string,
): Promise<AdministrationActionResult> {
  return administrationAction(`/v1/hr/employees/${encodeURIComponent(employeeId)}/invitation`, {});
}

export async function createTeamForAdministration(
  input: CreateTeamAdminRequest,
): Promise<AdministrationActionResult> {
  return administrationAction('/v1/hr/teams', input);
}

export async function setTeamStateForAdministration(
  teamId: string,
  active: boolean,
): Promise<AdministrationActionResult> {
  return administrationAction(`/v1/hr/teams/${encodeURIComponent(teamId)}/state`, { active });
}

export async function replaceTeamAssignmentForAdministration(
  employeeId: string,
  input: ReplaceTeamAssignmentRequest,
): Promise<AdministrationActionResult> {
  return administrationAction(
    `/v1/hr/employees/${encodeURIComponent(employeeId)}/team-assignment`,
    input,
  );
}

export async function replaceManagerAssignmentForAdministration(
  employeeId: string,
  input: ReplaceManagerAssignmentRequest,
): Promise<AdministrationActionResult> {
  return administrationAction(
    `/v1/hr/employees/${encodeURIComponent(employeeId)}/manager-assignment`,
    input,
  );
}

export async function createScheduleVersionForAdministration(
  input: CreateScheduleVersionAdminRequest,
): Promise<AdministrationActionResult> {
  return administrationAction('/v1/hr/time-settings/schedule-versions', input);
}

export async function createTimePolicyVersionForAdministration(
  input: CreateTimePolicyVersionAdminRequest,
): Promise<AdministrationActionResult> {
  return administrationAction('/v1/hr/time-settings/policy-versions', input);
}

export async function createAbsenceTypeVersionForAdministration(
  input: CreateAbsenceTypeVersionAdminRequest,
): Promise<AdministrationActionResult> {
  return administrationAction('/v1/hr/absence-settings/versions', input);
}

export async function createHolidayForAdministration(
  input: CreateHolidayAdminRequest,
): Promise<AdministrationActionResult> {
  return administrationAction('/v1/hr/holiday-settings', input);
}

export async function createEntitlementAdjustmentForAdministration(
  employeeId: string,
  input: CreateEntitlementAdjustmentAdminRequest,
): Promise<AdministrationActionResult> {
  return administrationAction(
    `/v1/hr/employees/${encodeURIComponent(employeeId)}/entitlement-adjustments`,
    input,
  );
}

export async function replaceScheduleAssignmentForAdministration(
  employeeId: string,
  input: ReplaceScheduleAssignmentAdminRequest,
): Promise<AdministrationActionResult> {
  return administrationAction(
    `/v1/hr/employees/${encodeURIComponent(employeeId)}/schedule-assignment`,
    input,
  );
}

export async function replacePolicyAssignmentForAdministration(
  employeeId: string,
  input: ReplacePolicyAssignmentAdminRequest,
): Promise<AdministrationActionResult> {
  return administrationAction(
    `/v1/hr/employees/${encodeURIComponent(employeeId)}/policy-assignment`,
    input,
  );
}

export async function createTechnicalAccount(
  input: CreateTechnicalAccountRequest,
): Promise<AdministrationActionResult> {
  return administrationAction('/v1/system/accounts', input);
}

export async function setSystemAccountState(
  accountId: string,
  active: boolean,
): Promise<AdministrationActionResult> {
  return administrationAction(`/v1/system/accounts/${encodeURIComponent(accountId)}/state`, {
    active,
  });
}

export async function setSystemAdministratorRole(
  accountId: string,
  enabled: boolean,
): Promise<AdministrationActionResult> {
  return administrationAction(`/v1/system/accounts/${encodeURIComponent(accountId)}/system-role`, {
    enabled,
  });
}

export async function revokeSystemAccountSession(
  accountId: string,
  sessionId: string,
): Promise<AdministrationActionResult> {
  return administrationAction(
    `/v1/system/accounts/${encodeURIComponent(accountId)}/sessions/${encodeURIComponent(sessionId)}/revoke`,
    {},
  );
}

async function administrationAction(
  path: string,
  input: unknown,
): Promise<AdministrationActionResult> {
  const body = await administrationMutation(path, input);
  const parsed = administrationActionEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

async function administrationMutation(path: string, input: unknown): Promise<unknown> {
  const token = await getCsrfToken();
  return requestJson(path, {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json', 'x-workledger-csrf': token },
    method: 'POST',
  });
}

export async function signOut(): Promise<void> {
  const response = await fetch('/api/auth/sign-out', {
    body: '{}',
    credentials: 'same-origin',
    headers: jsonHeaders(),
    method: 'POST',
  });
  if (!response.ok) throw new ApiClientError('DEPENDENCY_FAILURE', response.status);
}

export async function revokeSelfSession(sessionId: string) {
  const token = await getCsrfToken();
  const body = await requestJson(`/v1/me/sessions/${encodeURIComponent(sessionId)}/revoke`, {
    headers: { 'x-workledger-csrf': token },
    method: 'POST',
  });
  const parsed = revokeSelfSessionEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  return parsed.data.data;
}

export function clearSessionMemory(): void {
  csrfToken = null;
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken !== null) return csrfToken;
  const body = await requestJson('/v1/me/csrf');
  const parsed = csrfBootstrapEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiClientError('DEPENDENCY_FAILURE', 502);
  csrfToken = parsed.data.data.token;
  return csrfToken;
}

async function requestJson(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: { accept: 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiClientError('DEPENDENCY_FAILURE', 0);
  }
  const body = await safeJson(response);
  if (response.ok) return body;

  const parsedError = apiErrorEnvelopeSchema.safeParse(body);
  throw new ApiClientError(
    parsedError.success ? parsedError.data.error.code : 'DEPENDENCY_FAILURE',
    response.status,
    parsedError.success ? parsedError.data.error.requestId : undefined,
    parsedError.success ? parsedError.data.error.context : undefined,
    parsedError.success ? parsedError.data.meta?.idempotentReplay : undefined,
    parsedError.success ? parsedError.data.error.fields : undefined,
  );
}

function jsonHeaders(): HeadersInit {
  return { accept: 'application/json', 'content-type': 'application/json' };
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function isErrorCodeRecord(value: unknown): value is Readonly<{ code: string }> {
  return (
    typeof value === 'object' && value !== null && 'code' in value && typeof value.code === 'string'
  );
}

function reportExportFilename(reportKey: ReportKey, from: string, to: string): string {
  return `workledger-${reportKey}-${from}-to-${to}.csv`;
}
