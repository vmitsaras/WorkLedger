import { StatusBadge } from '@workledger/ui';
import { useWorkLedgerMessage } from '@workledger/i18n/react';

import {
  workflowStatusMessageKey,
  workflowStatusPresentation,
  type WorkflowStatus,
} from '../app/workflow-status-presentation.js';

export function WorkflowStatusBadge({ status }: Readonly<{ status: WorkflowStatus }>) {
  const t = useWorkLedgerMessage();
  const presentation = workflowStatusPresentation(status);
  return <StatusBadge tone={presentation.tone}>{t(workflowStatusMessageKey(status))}</StatusBadge>;
}
