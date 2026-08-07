const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export interface FixedInstantClock {
  readonly instant: string;
  now(): string;
}

export function createFixedInstantClock(instant: string): FixedInstantClock {
  if (!ISO_INSTANT_PATTERN.test(instant)) {
    throw new Error('Fixed test clocks must use an ISO UTC instant string.');
  }

  return {
    instant,
    now: () => instant,
  };
}
