import { TEAM_AVAILABILITY_STATES, type TeamAvailabilityState } from '@workledger/contracts';

const TEAM_STATUS_VIEW_KEYS = ['availability', 'records'] as const;
const TEAM_RECORD_FILTERS = ['ALL', 'OPEN'] as const;

export type TeamAvailabilityFilter = 'ALL' | TeamAvailabilityState;
export type TeamRecordFilter = (typeof TEAM_RECORD_FILTERS)[number];

export type TeamStatusView = Readonly<{
  availability: TeamAvailabilityFilter;
  records: TeamRecordFilter;
}>;

export const DEFAULT_TEAM_STATUS_VIEW: TeamStatusView = Object.freeze({
  availability: 'ALL',
  records: 'ALL',
});

export function parseTeamStatusView(searchParams: URLSearchParams): TeamStatusView | null {
  for (const key of new Set(searchParams.keys())) {
    if (!TEAM_STATUS_VIEW_KEYS.some((allowedKey) => allowedKey === key)) return null;
  }

  const availabilityValues = searchParams.getAll('availability');
  const recordValues = searchParams.getAll('records');
  if (availabilityValues.length > 1 || recordValues.length > 1) return null;

  const availability = availabilityValues[0] ?? DEFAULT_TEAM_STATUS_VIEW.availability;
  const records = recordValues[0] ?? DEFAULT_TEAM_STATUS_VIEW.records;
  if (!isAvailabilityFilter(availability) || !isRecordFilter(records)) return null;

  return Object.freeze({ availability, records });
}

export function toTeamStatusSearchParams(view: TeamStatusView): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (view.availability !== DEFAULT_TEAM_STATUS_VIEW.availability) {
    searchParams.set('availability', view.availability);
  }
  if (view.records !== DEFAULT_TEAM_STATUS_VIEW.records) {
    searchParams.set('records', view.records);
  }
  return searchParams;
}

function isAvailabilityFilter(value: string): value is TeamAvailabilityFilter {
  return value === 'ALL' || TEAM_AVAILABILITY_STATES.some((state) => state === value);
}

function isRecordFilter(value: string): value is TeamRecordFilter {
  return TEAM_RECORD_FILTERS.some((filter) => filter === value);
}
