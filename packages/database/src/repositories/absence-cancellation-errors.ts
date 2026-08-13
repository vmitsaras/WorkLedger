/** Signals a caller to use the post-lock adjustment workflow instead of ordinary cancellation. */
export class AbsenceCancellationLockedPeriodError extends Error {
  constructor() {
    super('Cancellation targets a locked monthly period.');
    this.name = 'AbsenceCancellationLockedPeriodError';
  }
}
