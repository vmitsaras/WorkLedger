export function formatLocalDate(localDate: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return localDate;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function formatTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value));
}

export function formatTimeWithOffset(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'shortOffset',
  }).format(new Date(value));
}

export function formatDuration(minutes: number, showPositiveSign = false): string {
  const sign = minutes < 0 ? '−' : showPositiveSign && minutes > 0 ? '+' : '';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remaining = absolute % 60;
  return `${sign}${hours}h ${remaining.toString().padStart(2, '0')}m`;
}
