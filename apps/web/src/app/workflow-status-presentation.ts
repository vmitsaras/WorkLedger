import {
  MONTHLY_PERIOD_STATUSES,
  PERSONAL_REQUEST_ITEM_STATUSES,
  type MonthlyPeriodStatus,
  type PersonalRequestItemStatus,
} from '@workledger/contracts';
import type { StatusBadgeProps } from '@workledger/ui';

export type WorkflowStatus = MonthlyPeriodStatus | PersonalRequestItemStatus;

export type WorkflowStatusPresentation = Readonly<{
  label: string;
  tone: NonNullable<StatusBadgeProps['tone']>;
}>;

const WORKFLOW_STATUS_PRESENTATIONS = Object.freeze({
  ACKNOWLEDGED: { label: 'Acknowledged', tone: 'success' },
  APPLIED: { label: 'Applied', tone: 'success' },
  APPROVED: { label: 'Approved', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  CHANGES_REQUESTED: { label: 'Changes requested', tone: 'warning' },
  LOCKED: { label: 'Locked', tone: 'success' },
  OPEN: { label: 'Open', tone: 'neutral' },
  PARTIALLY_CANCELLED: { label: 'Partially cancelled', tone: 'warning' },
  PENDING_DECISION: { label: 'Pending decision', tone: 'info' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  REPORTED: { label: 'Reported', tone: 'info' },
  SUBMITTED: { label: 'Submitted', tone: 'info' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'neutral' },
} as const satisfies Readonly<Record<WorkflowStatus, WorkflowStatusPresentation>>);

export const WORKFLOW_STATUSES = Object.freeze([
  ...new Set([...PERSONAL_REQUEST_ITEM_STATUSES, ...MONTHLY_PERIOD_STATUSES]),
] as WorkflowStatus[]);

export function workflowStatusPresentation(status: WorkflowStatus): WorkflowStatusPresentation {
  return WORKFLOW_STATUS_PRESENTATIONS[status];
}

export function workflowStatusLabel(status: WorkflowStatus): string {
  return workflowStatusPresentation(status).label;
}
