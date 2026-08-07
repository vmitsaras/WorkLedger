import { createFixedInstantClock } from '../src/index.js';

test('returns the same instant on every read', () => {
  const clock = createFixedInstantClock('2026-08-07T10:30:00Z');

  expect(clock.instant).toBe('2026-08-07T10:30:00Z');
  expect(clock.now()).toBe('2026-08-07T10:30:00Z');
});

test('rejects non-UTC instant strings', () => {
  expect(() => createFixedInstantClock('2026-08-07 10:30')).toThrow(/ISO UTC instant string/);
});
