import type { RefObject } from 'react';

import type { AttendanceCommand, TodayAttendance } from '@workledger/contracts';
import type { MessageKey } from '@workledger/i18n';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, Dialog } from '@workledger/ui';

import { ApiClientError, type AttendanceCommandIntent } from '../app/api-client.js';

const ATTENDANCE_ACTION_KEYS: Readonly<Record<AttendanceCommand, MessageKey>> = {
  CLOCK_IN: 'employee.today.attendance.action.clockIn',
  CLOCK_OUT: 'employee.today.attendance.action.clockOut',
  RESUME: 'employee.today.attendance.action.resume',
  START_BREAK: 'employee.today.attendance.action.startBreak',
};

const ATTENDANCE_PENDING_KEYS: Readonly<Record<AttendanceCommand, MessageKey>> = {
  CLOCK_IN: 'employee.today.attendance.pending.clockIn',
  CLOCK_OUT: 'employee.today.attendance.pending.clockOut',
  RESUME: 'employee.today.attendance.pending.resume',
  START_BREAK: 'employee.today.attendance.pending.startBreak',
};

export type AttendanceRecoveryMode = 'DEPENDENCY' | 'OFFLINE' | 'RECONNECTING' | null;

export function TodayAttendanceControls({
  attendance,
  controlsDisabled,
  controlsRef,
  clockOutConfirmationOpen,
  onActionFocus,
  onAttendanceCommand,
  pendingIntent,
  setClockOutConfirmationOpen,
}: Readonly<{
  attendance: TodayAttendance['attendance'];
  controlsDisabled: boolean;
  controlsRef: RefObject<HTMLDivElement | null>;
  clockOutConfirmationOpen: boolean;
  onActionFocus: (command: AttendanceCommand) => void;
  onAttendanceCommand: (
    command: AttendanceCommand,
    expectedAttendanceRevision: number,
    confirmActiveBreak?: boolean,
  ) => void;
  pendingIntent: AttendanceCommandIntent | null;
  setClockOutConfirmationOpen: (isOpen: boolean) => void;
}>) {
  const t = useWorkLedgerMessage();
  return (
    <div
      ref={controlsRef}
      aria-label={t('employee.today.attendance.actionsLabel')}
      className="grid max-w-md gap-3 sm:grid-cols-2"
      role="group"
    >
      {attendance.validActions.map((action, index) => {
        const isPendingAction = pendingIntent?.command === action;
        const label = t(
          isPendingAction ? ATTENDANCE_PENDING_KEYS[action] : ATTENDANCE_ACTION_KEYS[action],
        );
        const variant = index === 0 ? 'primary' : 'secondary';

        if (action === 'CLOCK_OUT' && attendance.state === 'ON_BREAK') {
          return (
            <div key={action} className="grid" onFocusCapture={() => onActionFocus(action)}>
              <Dialog
                actions={({ close }) => (
                  <>
                    <Button variant="secondary" isDisabled={pendingIntent !== null} onPress={close}>
                      {t('employee.today.attendance.confirm.cancel')}
                    </Button>
                    <Button
                      isDisabled={pendingIntent !== null}
                      onPress={() =>
                        onAttendanceCommand('CLOCK_OUT', attendance.attendanceRevision, true)
                      }
                    >
                      {isPendingAction
                        ? t('employee.today.attendance.pending.clockOut')
                        : t('employee.today.attendance.confirm.submit')}
                    </Button>
                  </>
                )}
                isDismissable={pendingIntent === null}
                isOpen={clockOutConfirmationOpen}
                onOpenChange={(isOpen) => {
                  if (pendingIntent === null || isOpen) setClockOutConfirmationOpen(isOpen);
                }}
                title={t('employee.today.attendance.confirm.title')}
                triggerIsDisabled={pendingIntent !== null || controlsDisabled}
                triggerLabel={label}
                triggerVariant={variant}
              >
                <p className="m-0">{t('employee.today.attendance.confirm.description')}</p>
              </Dialog>
            </div>
          );
        }

        return (
          <form
            key={action}
            aria-busy={isPendingAction}
            className="grid"
            onFocusCapture={() => onActionFocus(action)}
            onSubmit={(event) => {
              event.preventDefault();
              if (pendingIntent === null && !controlsDisabled) {
                onAttendanceCommand(action, attendance.attendanceRevision);
              }
            }}
          >
            <Button
              className="w-full"
              type="submit"
              variant={variant}
              isDisabled={pendingIntent !== null || controlsDisabled}
            >
              {label}
            </Button>
          </form>
        );
      })}
    </div>
  );
}

export function AttendanceRecovery({
  error,
  mode,
  retry,
}: Readonly<{
  error: unknown;
  mode: AttendanceRecoveryMode;
  retry: () => void;
}>) {
  const t = useWorkLedgerMessage();
  if (mode === null) return null;
  if (mode === 'RECONNECTING') {
    return (
      <Alert
        headingLevel="h3"
        title={t('employee.today.attendance.recovery.reconnecting.title')}
        tone="info"
      >
        <p className="m-0 text-sm font-semibold">
          {t('employee.today.attendance.recovery.reconnecting.description')}
        </p>
      </Alert>
    );
  }
  if (mode === 'OFFLINE') {
    return (
      <Alert
        headingLevel="h3"
        title={t('employee.today.attendance.recovery.offline.title')}
        tone="danger"
      >
        <p className="m-0 text-sm leading-6">
          {t('employee.today.attendance.recovery.offline.description')}
        </p>
      </Alert>
    );
  }
  const requestId = error instanceof ApiClientError ? error.requestId : undefined;
  return (
    <Alert
      headingLevel="h3"
      title={t('employee.today.attendance.recovery.dependency.title')}
      tone="danger"
    >
      <p className="m-0 text-sm font-semibold">
        {t('employee.today.attendance.recovery.dependency.description')}
      </p>
      {requestId === undefined ? null : (
        <p className="m-0 break-all text-xs">
          {t('employee.today.page.requestReference', { requestId })}
        </p>
      )}
      <div>
        <Button variant="secondary" onPress={retry}>
          {t('shared.action.tryAgain')}
        </Button>
      </div>
    </Alert>
  );
}
