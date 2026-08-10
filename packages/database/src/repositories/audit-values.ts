import { parseDomainId, parseLocalDate } from '@workledger/domain';

import type {
  AppendDomainAuditEventInput,
  AppendSecurityAuditEventInput,
  ApplicationRole,
  AuditActor,
  DomainAuditFacts,
  SecurityAuditFacts,
} from './contracts.js';

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,79}$/u;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,159}$/u;
const APPLICATION_ROLES: readonly ApplicationRole[] = [
  'EMPLOYEE',
  'MANAGER',
  'HR_ADMINISTRATOR',
  'SYSTEM_ADMINISTRATOR',
];
const DOMAIN_FACT_KEYS = new Set([
  'attendanceRevision',
  'effectiveDate',
  'eventCount',
  'minutes',
  'nextStatus',
  'previousStatus',
  'sourceCount',
  'version',
]);
const SECURITY_FACT_KEYS = new Set([
  'authenticationMethod',
  'changedRole',
  'failureCategory',
  'httpStatus',
  'sessionId',
  'scope',
]);

export class AuditValueError extends Error {
  constructor(field: string) {
    super(`Invalid safe audit value for ${field}.`);
    this.name = 'AuditValueError';
  }
}

export function validateDomainAuditInput(input: AppendDomainAuditEventInput): void {
  validateCommon(input);
  parseDomainAuditFacts(input.facts);
}

export function validateSecurityAuditInput(input: AppendSecurityAuditEventInput): void {
  validateCommon(input);
  parseSecurityAuditFacts(input.facts);
}

export function parseDomainAuditFacts(value: unknown): DomainAuditFacts {
  const facts = auditFactRecord(value, DOMAIN_FACT_KEYS);
  const attendanceRevision = optionalNonNegativeInteger(facts, 'attendanceRevision');
  const effectiveDateValue = optionalString(facts, 'effectiveDate');
  const eventCount = optionalNonNegativeInteger(facts, 'eventCount');
  const minutes = optionalInteger(facts, 'minutes');
  const nextStatus = optionalCode(facts, 'nextStatus');
  const previousStatus = optionalCode(facts, 'previousStatus');
  const sourceCount = optionalNonNegativeInteger(facts, 'sourceCount');
  const version = optionalNonNegativeInteger(facts, 'version');
  let effectiveDate: DomainAuditFacts['effectiveDate'];
  if (effectiveDateValue !== undefined) {
    const parsed = parseLocalDate(effectiveDateValue);
    if (!parsed.ok) throw new AuditValueError('facts.effectiveDate');
    effectiveDate = parsed.value;
  }
  return Object.freeze({
    ...(attendanceRevision === undefined ? {} : { attendanceRevision }),
    ...(effectiveDate === undefined ? {} : { effectiveDate }),
    ...(eventCount === undefined ? {} : { eventCount }),
    ...(minutes === undefined ? {} : { minutes }),
    ...(nextStatus === undefined ? {} : { nextStatus }),
    ...(previousStatus === undefined ? {} : { previousStatus }),
    ...(sourceCount === undefined ? {} : { sourceCount }),
    ...(version === undefined ? {} : { version }),
  });
}

export function parseSecurityAuditFacts(value: unknown): SecurityAuditFacts {
  const facts = auditFactRecord(value, SECURITY_FACT_KEYS);
  const authenticationMethod = optionalCode(facts, 'authenticationMethod');
  const changedRoleValue = optionalString(facts, 'changedRole');
  const failureCategory = optionalCode(facts, 'failureCategory');
  const httpStatus = optionalInteger(facts, 'httpStatus');
  const sessionIdValue = optionalIdentifier(facts, 'sessionId');
  const scope = optionalCode(facts, 'scope');
  let changedRole: ApplicationRole | undefined;
  if (changedRoleValue !== undefined) {
    changedRole = APPLICATION_ROLES.find((role) => role === changedRoleValue);
    if (changedRole === undefined) throw new AuditValueError('facts.changedRole');
  }
  if (httpStatus !== undefined && (httpStatus < 100 || httpStatus > 599)) {
    throw new AuditValueError('facts.httpStatus');
  }
  let sessionId: SecurityAuditFacts['sessionId'];
  if (sessionIdValue !== undefined) {
    const parsed = parseDomainId<'Session'>(sessionIdValue);
    if (!parsed.ok) throw new AuditValueError('facts.sessionId');
    sessionId = parsed.value;
  }
  return Object.freeze({
    ...(authenticationMethod === undefined ? {} : { authenticationMethod }),
    ...(changedRole === undefined ? {} : { changedRole }),
    ...(failureCategory === undefined ? {} : { failureCategory }),
    ...(httpStatus === undefined ? {} : { httpStatus }),
    ...(sessionId === undefined ? {} : { sessionId }),
    ...(scope === undefined ? {} : { scope }),
  });
}

function validateCommon(
  input: Pick<
    AppendDomainAuditEventInput | AppendSecurityAuditEventInput,
    'actionCode' | 'actor' | 'reasonCode' | 'targetId'
  >,
): void {
  if (!CODE_PATTERN.test(input.actionCode)) throw new AuditValueError('actionCode');
  if (!IDENTIFIER_PATTERN.test(input.targetId)) throw new AuditValueError('targetId');
  validateOptionalCode(input.reasonCode ?? undefined, 'reasonCode');
  validateActor(input.actor);
}

function validateActor(actor: AuditActor): void {
  if (actor.kind === 'SYSTEM') {
    if (!IDENTIFIER_PATTERN.test(actor.systemProcess)) {
      throw new AuditValueError('actor.systemProcess');
    }
    return;
  }
  if (actor.role !== null && !APPLICATION_ROLES.includes(actor.role)) {
    throw new AuditValueError('actor.role');
  }
}

function auditFactRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).some((key) => !allowedKeys.has(key))
  ) {
    throw new AuditValueError('facts');
  }
  return Object.fromEntries(Object.entries(value));
}

function validateOptionalCode(value: string | undefined, field: string): void {
  if (value !== undefined && !CODE_PATTERN.test(value)) throw new AuditValueError(field);
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new AuditValueError(`facts.${key}`);
  return value;
}

function optionalCode(record: Record<string, unknown>, key: string): string | undefined {
  const value = optionalString(record, key);
  if (value !== undefined && !CODE_PATTERN.test(value)) {
    throw new AuditValueError(`facts.${key}`);
  }
  return value;
}

function optionalIdentifier(record: Record<string, unknown>, key: string): string | undefined {
  const value = optionalString(record, key);
  if (value !== undefined && !IDENTIFIER_PATTERN.test(value)) {
    throw new AuditValueError(`facts.${key}`);
  }
  return value;
}

function optionalInteger(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new AuditValueError(`facts.${key}`);
  }
  return value;
}

function optionalNonNegativeInteger(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = optionalInteger(record, key);
  if (value !== undefined && value < 0) throw new AuditValueError(`facts.${key}`);
  return value;
}
