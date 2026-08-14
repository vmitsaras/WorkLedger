import {
  csvCell,
  createReportCsv,
  isFormulaSignificantText,
  reportCsvFitsBounds,
} from '../src/reports/csv.js';

test.each([
  '=2+2',
  '+SUM(A1:A2)',
  '-2+3',
  '@IMPORTDATA("https://example.invalid")',
  '\tplain text',
  '\rplain text',
  '\nplain text',
  '   =2+2',
  '\u0000  @command',
  '\u00a0+2+2',
])('neutralizes formula-significant text after control and whitespace inspection: %j', (value) => {
  expect(isFormulaSignificantText(value)).toBe(true);
  expect(csvCell(value).replace(/^"/u, '').startsWith("'")).toBe(true);
});

test.each(['Emma Reed', '  Emma Reed', "'=2+2", '2026-08-01', ''])(
  'preserves safe text: %j',
  (value) => {
    expect(isFormulaSignificantText(value)).toBe(false);
    expect(csvCell(value)).toBe(value);
  },
);

test('applies apostrophe neutralization before ordinary quoting and preserves numeric negatives', () => {
  expect(csvCell('=2+2')).toBe("'=2+2");
  expect(csvCell('=2+2, "quoted"')).toBe('"\'=2+2, ""quoted"""');
  expect(csvCell('\r=2+2')).toBe('"\'\r=2+2"');
  expect(csvCell(-60)).toBe('-60');
});

test('creates a CRLF-terminated UTF-8-ready report with a generic filename and no hidden identifiers', () => {
  const document = createReportCsv('flexible-time', { from: '2026-08-01', to: '2026-08-31' }, [
    {
      closingBalanceMinutes: -60,
      employeeDisplayName: '=2+2',
      kind: 'FLEXIBLE_TIME',
      openingBalanceMinutes: 0,
      rangeChangeMinutes: -60,
    },
  ]);

  expect(document.filename).toBe('workledger-flexible-time-2026-08-01-to-2026-08-31.csv');
  expect(document.rowCount).toBe(1);
  expect(document.body).toBe(
    'employee_name,opening_balance_minutes,range_change_minutes,closing_balance_minutes\r\n' +
      "'=2+2,0,-60,-60\r\n",
  );
  expect(new TextDecoder().decode(new TextEncoder().encode(document.body))).toBe(document.body);
  expect(document.body).not.toMatch(/employee_id|source_id|approval_id|monthly_period_id/iu);
  expect(document.body.endsWith('\r\n')).toBe(true);
  expect(document.body.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/u);
});

test('rejects export row and UTF-8 byte counts beyond configured bounds', () => {
  const document = Object.freeze({ body: 'éé', filename: 'workledger-test.csv', rowCount: 2 });
  expect(reportCsvFitsBounds(document, 2, { maxBytes: 4, maxRows: 2 })).toBe(true);
  expect(reportCsvFitsBounds(document, 3, { maxBytes: 4, maxRows: 2 })).toBe(false);
  expect(reportCsvFitsBounds(document, 2, { maxBytes: 3, maxRows: 2 })).toBe(false);
  expect(reportCsvFitsBounds(document, -1, { maxBytes: 4, maxRows: 2 })).toBe(false);
});
