/** Signals a caller to use the post-lock adjustment workflow instead of ordinary cancellation. */
export class AbsenceCancellationLockedPeriodError extends Error {
  constructor() {
    super('Cancellation targets a locked monthly period.');
    this.name = 'AbsenceCancellationLockedPeriodError';
  }
}

/** Signals that reviewer changes must reopen a submitted or approved period first. */
export class AbsenceCancellationReopenPeriodError extends Error {
  constructor() {
    super('Cancellation targets a submitted or approved monthly period.');
    this.name = 'AbsenceCancellationReopenPeriodError';
  }
}
