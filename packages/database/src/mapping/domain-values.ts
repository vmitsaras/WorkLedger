import {
  parseDomainId,
  parseInstant,
  parseLocalDate,
  parseNonNegativeMinutes,
  parseSignedMinutes,
  type DomainId,
  type Instant,
  type LocalDate,
  type NonNegativeMinutes,
  type SignedMinutes,
} from '@workledger/domain';

export class DatabaseValueError extends Error {
  readonly code = 'DATABASE_VALUE_INVALID';

  constructor(
    readonly table: string,
    readonly column: string,
  ) {
    super(`Invalid persisted value in ${table}.${column}.`);
    this.name = 'DatabaseValueError';
  }
}

export function mapDomainId<Entity extends string>(
  value: unknown,
  table: string,
  column: string,
): DomainId<Entity> {
  const result = parseDomainId<Entity>(value);
  if (!result.ok) throw new DatabaseValueError(table, column);
  return result.value;
}

export function mapInstant(value: unknown, table: string, column: string): Instant {
  const result = parseInstant(value);
  if (!result.ok) throw new DatabaseValueError(table, column);
  return result.value;
}

export function mapLocalDate(value: unknown, table: string, column: string): LocalDate {
  const result = parseLocalDate(value);
  if (!result.ok) throw new DatabaseValueError(table, column);
  return result.value;
}

export function mapNonNegativeMinutes(
  value: unknown,
  table: string,
  column: string,
): NonNegativeMinutes {
  const result = parseNonNegativeMinutes(value);
  if (!result.ok) throw new DatabaseValueError(table, column);
  return result.value;
}

export function mapSignedMinutes(value: unknown, table: string, column: string): SignedMinutes {
  const result = parseSignedMinutes(value);
  if (!result.ok) throw new DatabaseValueError(table, column);
  return result.value;
}
