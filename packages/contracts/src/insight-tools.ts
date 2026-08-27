import { z } from 'zod';

export const INSIGHT_TOOL_CODES = [
  'employee_balance_change',
  'employee_leave_projection',
  'employee_submission_blockers',
  'employee_today_explanation',
] as const;

export const MAX_INSIGHT_TOOL_DATE_RANGE_DAYS = 366;

const dateSchema = z.iso.date();

export const insightToolCodeSchema = z.enum(INSIGHT_TOOL_CODES);

function gregorianDayNumber(value: string): number {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const shiftedYear = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(shiftedYear / 400);
  const yearOfEra = shiftedYear - era * 400;
  const shiftedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;

  return (
    era * 146_097 +
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear
  );
}

export const employeeBalanceChangeToolArgumentsSchema = z
  .strictObject({
    endDate: dateSchema,
    startDate: dateSchema,
  })
  .superRefine((value, context) => {
    const startDay = gregorianDayNumber(value.startDate);
    const endDay = gregorianDayNumber(value.endDate);
    if (startDay > endDay) {
      context.addIssue({
        code: 'custom',
        message: 'The Insight tool start date must not be after the end date.',
        path: ['endDate'],
      });
      return;
    }
    if (endDay - startDay + 1 > MAX_INSIGHT_TOOL_DATE_RANGE_DAYS) {
      context.addIssue({
        code: 'custom',
        message: `The Insight tool date range must not exceed ${MAX_INSIGHT_TOOL_DATE_RANGE_DAYS} inclusive calendar days.`,
        path: ['endDate'],
      });
    }
  });

export const employeeLeaveProjectionToolArgumentsSchema = z.strictObject({
  date: dateSchema,
});

export const employeeSubmissionBlockersToolArgumentsSchema = z.strictObject({
  monthStart: dateSchema.refine(
    (value) => value.endsWith('-01'),
    'An Insight tool month must use its first local date.',
  ),
});

export const employeeTodayExplanationToolArgumentsSchema = z.strictObject({
  date: dateSchema,
});

export const insightToolArgumentSchemas = Object.freeze({
  employee_balance_change: employeeBalanceChangeToolArgumentsSchema,
  employee_leave_projection: employeeLeaveProjectionToolArgumentsSchema,
  employee_submission_blockers: employeeSubmissionBlockersToolArgumentsSchema,
  employee_today_explanation: employeeTodayExplanationToolArgumentsSchema,
});

export const insightToolCallSchema = z.discriminatedUnion('code', [
  z.strictObject({
    arguments: employeeBalanceChangeToolArgumentsSchema,
    code: z.literal('employee_balance_change'),
  }),
  z.strictObject({
    arguments: employeeLeaveProjectionToolArgumentsSchema,
    code: z.literal('employee_leave_projection'),
  }),
  z.strictObject({
    arguments: employeeSubmissionBlockersToolArgumentsSchema,
    code: z.literal('employee_submission_blockers'),
  }),
  z.strictObject({
    arguments: employeeTodayExplanationToolArgumentsSchema,
    code: z.literal('employee_today_explanation'),
  }),
]);

export type InsightToolCode = z.infer<typeof insightToolCodeSchema>;
export type EmployeeBalanceChangeToolArguments = z.infer<
  typeof employeeBalanceChangeToolArgumentsSchema
>;
export type EmployeeLeaveProjectionToolArguments = z.infer<
  typeof employeeLeaveProjectionToolArgumentsSchema
>;
export type EmployeeSubmissionBlockersToolArguments = z.infer<
  typeof employeeSubmissionBlockersToolArgumentsSchema
>;
export type EmployeeTodayExplanationToolArguments = z.infer<
  typeof employeeTodayExplanationToolArgumentsSchema
>;
export type InsightToolCall = z.infer<typeof insightToolCallSchema>;
