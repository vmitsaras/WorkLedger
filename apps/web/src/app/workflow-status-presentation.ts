import {
  MONTHLY_PERIOD_STATUSES,
  PERSONAL_REQUEST_ITEM_STATUSES,
  type MonthlyPeriodStatus,
  type PersonalRequestItemStatus,
} from '@workledger/contracts';
import type { StatusBadgeProps } from '@workledger/ui';
import type { MessageKey } from '@workledger/i18n';

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

const WORKFLOW_STATUS_MESSAGE_KEYS = Object.freeze({
  ACKNOWLEDGED: 'shared.workflow.status.acknowledged',
  APPLIED: 'shared.workflow.status.applied',
  APPROVED: 'shared.workflow.status.approved',
  CANCELLED: 'shared.workflow.status.cancelled',
  CHANGES_REQUESTED: 'shared.workflow.status.changesRequested',
  LOCKED: 'shared.workflow.status.locked',
  OPEN: 'shared.workflow.status.open',
  PARTIALLY_CANCELLED: 'shared.workflow.status.partiallyCancelled',
  PENDING_DECISION: 'shared.workflow.status.pendingDecision',
  REJECTED: 'shared.workflow.status.rejected',
  REPORTED: 'shared.workflow.status.reported',
  SUBMITTED: 'shared.workflow.status.submitted',
  WITHDRAWN: 'shared.workflow.status.withdrawn',
} as const satisfies Readonly<Record<WorkflowStatus, MessageKey>>);

export const WORKFLOW_STATUSES = Object.freeze([
  ...new Set([...PERSONAL_REQUEST_ITEM_STATUSES, ...MONTHLY_PERIOD_STATUSES]),
] as WorkflowStatus[]);

export function workflowStatusPresentation(status: WorkflowStatus): WorkflowStatusPresentation {
  return WORKFLOW_STATUS_PRESENTATIONS[status];
}

export function workflowStatusLabel(status: WorkflowStatus): string {
  return workflowStatusPresentation(status).label;
}

export function workflowStatusMessageKey(status: WorkflowStatus): MessageKey {
  return WORKFLOW_STATUS_MESSAGE_KEYS[status];
}
