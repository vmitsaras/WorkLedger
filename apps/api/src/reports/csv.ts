import type { ReportKey, ReportRow } from '@workledger/contracts';

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

export function createReportCsv(
  key: ReportKey,
  range: Readonly<{ from: string; to: string }>,
  rows: readonly ReportRow[],
): ReportCsvDocument {
  const records = csvRecords(key, rows);
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

function csvRecords(key: ReportKey, rows: readonly ReportRow[]): readonly (readonly CsvCell[])[] {
  switch (key) {
    case 'monthly-time':
      return [
        [
          'employee_name',
          'month',
          'workflow_status',
          'expected_minutes',
          'worked_minutes',
          'credited_minutes',
          'balance_minutes',
          'incomplete_record_count',
          'post_lock_delta_minutes',
        ],
        ...rows.map((row) => {
          if (row.kind !== 'MONTHLY_TIME') throw mismatchedRow(key, row.kind);
          return [
            row.employeeDisplayName,
            row.monthStart,
            row.workflowStatus,
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
          'employee_name',
          'opening_balance_minutes',
          'range_change_minutes',
          'closing_balance_minutes',
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
          'employee_name',
          'leave_account',
          'opening_available_minutes',
          'available_change_minutes',
          'closing_available_minutes',
          'reserved_minutes',
          'projected_remaining_minutes',
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
        ['employee_name', 'date', 'status', 'expected_minutes', 'worked_minutes', 'warning_codes'],
        ...rows.map((row) => {
          if (row.kind !== 'MISSING_RECORD') throw mismatchedRow(key, row.kind);
          return [
            row.employeeDisplayName,
            row.localDate,
            row.status,
            row.expectedMinutes,
            row.workedMinutes,
            row.warningCodes.join(';'),
          ];
        }),
      ];
    case 'pending-approvals':
      return [
        [
          'employee_name',
          'workflow_category',
          'affected_start_date',
          'affected_end_date',
          'submitted_at',
        ],
        ...rows.map((row) => {
          if (row.kind !== 'PENDING_APPROVAL') throw mismatchedRow(key, row.kind);
          return [
            row.employeeDisplayName,
            row.approvalKind,
            row.affectedStartDate,
            row.affectedEndDate,
            row.submittedAt,
          ];
        }),
      ];
  }
}

function mismatchedRow(key: ReportKey, kind: ReportRow['kind']): Error {
  return new Error(`Report row ${kind} does not match ${key}.`);
}
