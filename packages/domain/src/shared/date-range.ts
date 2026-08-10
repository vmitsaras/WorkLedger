import { compareLocalDates, type LocalDate } from './temporal.js';
import { failure, success, type DomainError, type Result } from './result.js';

declare const localDateRangeBrand: unique symbol;

export type LocalDateRange = Readonly<{
  validFrom: LocalDate;
  validTo: LocalDate | null;
  readonly [localDateRangeBrand]: 'LocalDateRange';
}>;

export type InvalidLocalDateRangeError = DomainError<'INVALID_LOCAL_DATE_RANGE'>;

const INVALID_LOCAL_DATE_RANGE = Object.freeze({ code: 'INVALID_LOCAL_DATE_RANGE' } as const);

export function createLocalDateRange(
  validFrom: LocalDate,
  validTo: LocalDate | null = null,
): Result<LocalDateRange, InvalidLocalDateRangeError> {
  if (validTo !== null && compareLocalDates(validFrom, validTo) >= 0) {
    return failure(INVALID_LOCAL_DATE_RANGE);
  }

  return success(Object.freeze({ validFrom, validTo }) as LocalDateRange);
}

export function localDateRangeContains(range: LocalDateRange, date: LocalDate): boolean {
  return (
    compareLocalDates(date, range.validFrom) >= 0 &&
    (range.validTo === null || compareLocalDates(date, range.validTo) < 0)
  );
}
