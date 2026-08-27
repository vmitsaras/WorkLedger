import type { ReportKey, ReportRow, SupportedLocale } from '@workledger/contracts';

import {
  createOutputMessageTranslator,
  type OutputMessageKey,
  type OutputMessageTranslator,
} from '../i18n/output.js';

export const REPORT_EXPORT_MAX_ROWS = 100_000;
export const REPORT_EXPORT_MAX_BYTES = 32 * 1_024 * 1_024;
export const REPORT_CSV_CONTENT_TYPE = 'text/csv; charset=utf-8';

const CSV_DELIMITER = ',';
const CSV_LINE_ENDING = '\r\n';

type CsvCell = number | string;

export type ReportCsvDocument = Readonly<{
  body: string;
  filename: string;
  rowCount: number;
}>;

export function reportCsvFitsBounds(
  document: ReportCsvDocument,
  totalRows: number,
  bounds: Readonly<{ maxBytes: number; maxRows: number }> = {
    maxBytes: REPORT_EXPORT_MAX_BYTES,
    maxRows: REPORT_EXPORT_MAX_ROWS,
  },
): boolean {
  return (
    Number.isSafeInteger(totalRows) &&
    totalRows >= 0 &&
    totalRows <= bounds.maxRows &&
    document.rowCount <= bounds.maxRows &&
    new TextEncoder().encode(document.body).byteLength <= bounds.maxBytes
  );
}

export async function createReportCsv(
  key: ReportKey,
  range: Readonly<{ from: string; to: string }>,
  rows: readonly ReportRow[],
  locale: SupportedLocale,
): Promise<ReportCsvDocument> {
  const records = csvRecords(key, rows, await createOutputMessageTranslator(locale));
  const body = `${records.map(csvRecord).join(CSV_LINE_ENDING)}${CSV_LINE_ENDING}`;
  return Object.freeze({
    body,
    filename: `workledger-${key}-${range.from}-to-${range.to}.csv`,
    rowCount: rows.length,
  });
}

export function csvCell(value: CsvCell): string {
  const text = typeof value === 'number' ? value.toString() : neutralizeFormulaText(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function isFormulaSignificantText(value: string): boolean {
  for (const character of value) {
    if (character === '\t' || character === '\r' || character === '\n') return true;
    const codePoint = character.codePointAt(0);
    if (/\s/u.test(character) || (codePoint !== undefined && codePoint < 32)) {
      continue;
    }
    return character === '=' || character === '+' || character === '-' || character === '@';
  }
  return false;
}

function neutralizeFormulaText(value: string): string {
  return isFormulaSignificantText(value) ? `'${value}` : value;
}

function csvRecord(record: readonly CsvCell[]): string {
  return record.map(csvCell).join(CSV_DELIMITER);
}

function csvRecords(
  key: ReportKey,
  rows: readonly ReportRow[],
  t: OutputMessageTranslator,
): readonly (readonly CsvCell[])[] {
  switch (key) {
    case 'monthly-time':
      return [
        [
          t('output.csv.column.employeeName'),
          t('output.csv.column.month'),
          t('output.csv.column.workflowStatus'),
          t('output.csv.column.expectedMinutes'),
          t('output.csv.column.workedMinutes'),
          t('output.csv.column.creditedMinutes'),
          t('output.csv.column.balanceMinutes'),
          t('output.csv.column.incompleteRecordCount'),
          t('output.csv.column.postLockDeltaMinutes'),
        ],
        ...rows.map((row) => {
          if (row.kind !== 'MONTHLY_TIME') throw mismatchedRow(key, row.kind);
          return [
            row.employeeDisplayName,
            row.monthStart,
            t(WORKFLOW_STATUS_KEYS[row.workflowStatus]),
            row.expectedMinutes,
            row.workedMinutes,
            row.creditedMinutes,
            row.balanceMinutes,
            row.incompleteRecordCount,
            row.postLockDeltaMinutes,
          ];
        }),
      ];
    case 'flexible-time':
      return [
        [
          t('output.csv.column.employeeName'),
          t('output.csv.column.openingBalanceMinutes'),
          t('output.csv.column.rangeChangeMinutes'),
          t('output.csv.column.closingBalanceMinutes'),
        ],
        ...rows.map((row) => {
          if (row.kind !== 'FLEXIBLE_TIME') throw mismatchedRow(key, row.kind);
          return [
            row.employeeDisplayName,
            row.openingBalanceMinutes,
            row.rangeChangeMinutes,
            row.closingBalanceMinutes,
          ];
        }),
      ];
    case 'leave':
      return [
        [
          t('output.csv.column.employeeName'),
          t('output.csv.column.leaveAccount'),
          t('output.csv.column.openingAvailableMinutes'),
          t('output.csv.column.availableChangeMinutes'),
          t('output.csv.column.closingAvailableMinutes'),
          t('output.csv.column.reservedMinutes'),
          t('output.csv.column.projectedRemainingMinutes'),
        ],
        ...rows.map((row) => {
          if (row.kind !== 'LEAVE') throw mismatchedRow(key, row.kind);
          return [
            row.employeeDisplayName,
            row.accountName,
            row.openingAvailableMinutes,
            row.availableChangeMinutes,
            row.closingAvailableMinutes,
            row.reservedMinutes,
            row.projectedRemainingMinutes,
          ];
        }),
      ];
    case 'missing-records':
      return [
        [
          t('output.csv.column.employeeName'),
          t('output.csv.column.date'),
          t('output.csv.column.status'),
          t('output.csv.column.expectedMinutes'),
          t('output.csv.column.workedMinutes'),
          t('output.csv.column.warningCodes'),
        ],
        ...rows.map((row) => {
          if (row.kind !== 'MISSING_RECORD') throw mismatchedRow(key, row.kind);
          return [
            row.employeeDisplayName,
            row.localDate,
            t(RECORD_STATUS_KEYS[row.status]),
            row.expectedMinutes,
            row.workedMinutes,
            row.warningCodes.map((code) => t(RECORD_ISSUE_KEYS[code])).join(';'),
          ];
        }),
      ];
    case 'pending-approvals':
      return [
        [
          t('output.csv.column.employeeName'),
          t('output.csv.column.workflowCategory'),
          t('output.csv.column.affectedStartDate'),
          t('output.csv.column.affectedEndDate'),
          t('output.csv.column.submittedAt'),
        ],
        ...rows.map((row) => {
          if (row.kind !== 'PENDING_APPROVAL') throw mismatchedRow(key, row.kind);
          return [
            row.employeeDisplayName,
            t(APPROVAL_KIND_KEYS[row.approvalKind]),
            row.affectedStartDate,
            row.affectedEndDate,
            row.submittedAt,
          ];
        }),
      ];
  }
}

type MonthlyWorkflowStatus = Extract<ReportRow, { kind: 'MONTHLY_TIME' }>['workflowStatus'];
type MissingRecordStatus = Extract<ReportRow, { kind: 'MISSING_RECORD' }>['status'];
type RecordIssueCode = Extract<ReportRow, { kind: 'MISSING_RECORD' }>['warningCodes'][number];
type ApprovalKind = Extract<ReportRow, { kind: 'PENDING_APPROVAL' }>['approvalKind'];

const WORKFLOW_STATUS_KEYS = Object.freeze({
  APPROVED: 'output.csv.status.workflow.approved',
  CHANGES_REQUESTED: 'output.csv.status.workflow.changesRequested',
  LOCKED: 'output.csv.status.workflow.locked',
  OPEN: 'output.csv.status.workflow.open',
  SUBMITTED: 'output.csv.status.workflow.submitted',
} as const satisfies Readonly<Record<MonthlyWorkflowStatus, OutputMessageKey>>);

const RECORD_STATUS_KEYS = Object.freeze({
  INCOMPLETE: 'output.csv.status.record.incomplete',
} as const satisfies Readonly<Record<MissingRecordStatus, OutputMessageKey>>);

const APPROVAL_KIND_KEYS = Object.freeze({
  ABSENCE: 'output.csv.status.approvalKind.absence',
  CANCELLATION: 'output.csv.status.approvalKind.cancellation',
  CORRECTION: 'output.csv.status.approvalKind.correction',
  MONTHLY_PERIOD: 'output.csv.status.approvalKind.monthlyPeriod',
} as const satisfies Readonly<Record<ApprovalKind, OutputMessageKey>>);

const RECORD_ISSUE_KEYS = Object.freeze({
  ABSENCE_APPROVAL_PENDING: 'output.csv.issue.absenceApprovalPending',
  ATTENDANCE_INCOMPLETE: 'output.csv.issue.attendanceIncomplete',
  ATTENDANCE_INVALID_EVENT_ORDER: 'output.csv.issue.attendanceInvalidEventOrder',
  ATTENDANCE_INVALID_EVENT_PRECISION: 'output.csv.issue.attendanceInvalidEventPrecision',
  ATTENDANCE_OVERLAP: 'output.csv.issue.attendanceOverlap',
  CORRECTION_UNRESOLVED: 'output.csv.issue.correctionUnresolved',
  FLEX_NEGATIVE_THRESHOLD_EXCEEDED: 'output.csv.issue.flexNegativeThresholdExceeded',
  FLEX_POSITIVE_THRESHOLD_EXCEEDED: 'output.csv.issue.flexPositiveThresholdExceeded',
  LEDGER_SOURCE_MISMATCH: 'output.csv.issue.ledgerSourceMismatch',
  POLICY_ASSIGNMENT_OVERLAP: 'output.csv.issue.policyAssignmentOverlap',
  POLICY_CONFIGURATION_INVALID: 'output.csv.issue.policyConfigurationInvalid',
  POLICY_NOT_ASSIGNED: 'output.csv.issue.policyNotAssigned',
  SCHEDULE_ASSIGNMENT_OVERLAP: 'output.csv.issue.scheduleAssignmentOverlap',
  SCHEDULE_NOT_ASSIGNED: 'output.csv.issue.scheduleNotAssigned',
  WORK_DURING_ABSENCE: 'output.csv.issue.workDuringAbsence',
  WORK_ON_HOLIDAY: 'output.csv.issue.workOnHoliday',
  WORK_ON_ZERO_EXPECTED_DAY: 'output.csv.issue.workOnZeroExpectedDay',
} as const satisfies Readonly<Record<RecordIssueCode, OutputMessageKey>>);

function mismatchedRow(key: ReportKey, kind: ReportRow['kind']): Error {
  return new Error(`Report row ${kind} does not match ${key}.`);
}
