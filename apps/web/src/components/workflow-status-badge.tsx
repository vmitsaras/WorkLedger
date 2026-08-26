import { StatusBadge } from '@workledger/ui';

import {
  workflowStatusPresentation,
  type WorkflowStatus,
} from '../app/workflow-status-presentation.js';

export function WorkflowStatusBadge({ status }: Readonly<{ status: WorkflowStatus }>) {
  const presentation = workflowStatusPresentation(status);
  return <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>;
}
