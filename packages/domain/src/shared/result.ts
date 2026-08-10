export interface DomainError<Code extends string = string> {
  readonly code: Code;
}

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure<E extends DomainError> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E extends DomainError = DomainError> = Success<T> | Failure<E>;

export function success<T>(value: T): Success<T> {
  return Object.freeze({ ok: true, value });
}

export function failure<E extends DomainError>(error: E): Failure<E> {
  return Object.freeze({ ok: false, error });
}
