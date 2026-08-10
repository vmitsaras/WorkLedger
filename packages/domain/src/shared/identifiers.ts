import { failure, success, type DomainError, type Result } from './result.js';

declare const domainIdBrand: unique symbol;

export type DomainId<Entity extends string> = string & {
  readonly [domainIdBrand]: Entity;
};

export type InvalidDomainIdError = DomainError<'INVALID_DOMAIN_ID'>;

const DOMAIN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/;
const INVALID_DOMAIN_ID = Object.freeze({ code: 'INVALID_DOMAIN_ID' } as const);

export function parseDomainId<Entity extends string>(
  input: unknown,
): Result<DomainId<Entity>, InvalidDomainIdError> {
  if (typeof input !== 'string' || !DOMAIN_ID_PATTERN.test(input)) {
    return failure(INVALID_DOMAIN_ID);
  }

  return success(input as DomainId<Entity>);
}
