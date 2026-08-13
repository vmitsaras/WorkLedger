import {
  calculateVacationRequest,
  createLocalDateRange,
  createScheduleAssignment,
  createWeeklySchedule,
  parseDomainId,
  parseLocalDate,
} from '../src/index.js';

const ORGANIZATION_SCHEDULE_ID = parseDomainId<'WorkScheduleVersion'>(
  '123e4567-e89b-42d3-a456-426614174001',
).value;
const ASSIGNMENT_ID = parseDomainId<'ScheduleAssignment'>(
  '123e4567-e89b-42d3-a456-426614174002',
).value;

function date(value: string) {
  const parsed = parseLocalDate(value);
  if (!parsed.ok) throw new Error(`Invalid test date: ${value}`);
  return parsed.value;
}

function assignments() {
  const schedule = createWeeklySchedule(ORGANIZATION_SCHEDULE_ID, {
    FRIDAY: 480,
    MONDAY: 480,
    SATURDAY: 0,
    SUNDAY: 0,
    THURSDAY: 480,
    TUESDAY: 480,
    WEDNESDAY: 480,
  });
  const range = createLocalDateRange(date('2026-01-01'));
  if (!schedule.ok || !range.ok) throw new Error('Invalid test configuration.');
  const assignment = createScheduleAssignment(ASSIGNMENT_ID, range.value, schedule.value);
  if (!assignment.ok) throw new Error('Invalid test assignment.');
  return [assignment.value] as const;
}

describe('calculateVacationRequest', () => {
  it('keeps weekends, holidays, and zero-hour dates visible while consuming only scheduled minutes', () => {
    const result = calculateVacationRequest({
      endDate: date('2026-01-07'),
      holidayDates: [date('2026-01-06')],
      scheduleAssignments: assignments(),
      startDate: date('2026-01-02'),
    });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.entitlementMinutes).toBe(1440);
    expect(result.value.coverage).toEqual([
      expect.objectContaining({ localDate: '2026-01-02', entitlementMinutes: 480 }),
      expect.objectContaining({ localDate: '2026-01-03', entitlementMinutes: 0 }),
      expect.objectContaining({ localDate: '2026-01-04', entitlementMinutes: 0 }),
      expect.objectContaining({ localDate: '2026-01-05', entitlementMinutes: 480 }),
      expect.objectContaining({ localDate: '2026-01-06', entitlementMinutes: 0, holiday: true }),
      expect.objectContaining({ localDate: '2026-01-07', entitlementMinutes: 480 }),
    ]);
  });

  it('rejects reversed ranges and ranges over one calendar year', () => {
    expect(
      calculateVacationRequest({
        endDate: date('2026-01-01'),
        holidayDates: [],
        scheduleAssignments: assignments(),
        startDate: date('2026-01-02'),
      }),
    ).toMatchObject({ ok: false, error: { code: 'VACATION_DATE_RANGE_INVALID' } });
    expect(
      calculateVacationRequest({
        endDate: date('2027-01-02'),
        holidayDates: [],
        scheduleAssignments: assignments(),
        startDate: date('2026-01-01'),
      }),
    ).toMatchObject({ ok: false, error: { code: 'VACATION_DATE_RANGE_TOO_LARGE' } });
  });
});
