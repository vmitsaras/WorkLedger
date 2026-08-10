import { failure, success, type DomainError, type Result } from './result.js';

declare const signedMinutesBrand: unique symbol;
declare const nonNegativeMinutesBrand: unique symbol;

export type SignedMinutes = number & {
  readonly [signedMinutesBrand]: 'SignedMinutes';
};

export type NonNegativeMinutes = SignedMinutes & {
  readonly [nonNegativeMinutesBrand]: 'NonNegativeMinutes';
};

export type InvalidSignedMinutesError = DomainError<'INVALID_SIGNED_MINUTES'>;
export type InvalidNonNegativeMinutesError = DomainError<'INVALID_NON_NEGATIVE_MINUTES'>;

const INVALID_SIGNED_MINUTES = Object.freeze({ code: 'INVALID_SIGNED_MINUTES' } as const);
const INVALID_NON_NEGATIVE_MINUTES = Object.freeze({
  code: 'INVALID_NON_NEGATIVE_MINUTES',
} as const);

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

export function parseSignedMinutes(
  input: unknown,
): Result<SignedMinutes, InvalidSignedMinutesError> {
  if (typeof input !== 'number' || !Number.isSafeInteger(input)) {
    return failure(INVALID_SIGNED_MINUTES);
  }

  return success(normalizeZero(input) as SignedMinutes);
}

export function parseNonNegativeMinutes(
  input: unknown,
): Result<NonNegativeMinutes, InvalidNonNegativeMinutesError> {
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < 0) {
    return failure(INVALID_NON_NEGATIVE_MINUTES);
  }

  return success(normalizeZero(input) as NonNegativeMinutes);
}
