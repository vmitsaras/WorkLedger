import type { RefObject } from 'react';

import type { AttendanceCommand, TodayAttendance } from '@workledger/contracts';
import { Button, Dialog } from '@workledger/ui';

import { ApiClientError, type AttendanceCommandIntent } from '../app/api-client.js';

export const ATTENDANCE_ACTION_LABELS: Readonly<Record<AttendanceCommand, string>> = {
  CLOCK_IN: 'Clock in',
  CLOCK_OUT: 'Clock out',
  RESUME: 'Resume work',
  START_BREAK: 'Start break',
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
  return (
    <div ref={controlsRef} className="mt-3 flex flex-wrap gap-3">
      {attendance.validActions.map((action, index) => {
        const isPendingAction = pendingIntent?.command === action;
        const label = isPendingAction
          ? pendingActionLabel(action)
          : ATTENDANCE_ACTION_LABELS[action];
        const variant = index === 0 ? 'primary' : 'secondary';

        if (action === 'CLOCK_OUT' && attendance.state === 'ON_BREAK') {
          return (
            <div key={action} onFocusCapture={() => onActionFocus(action)}>
              <Dialog
                actions={({ close }) => (
                  <>
                    <Button variant="secondary" isDisabled={pendingIntent !== null} onPress={close}>
                      Cancel
                    </Button>
                    <Button
                      isDisabled={pendingIntent !== null}
                      onPress={() =>
                        onAttendanceCommand('CLOCK_OUT', attendance.attendanceRevision, true)
                      }
                    >
                      {isPendingAction ? 'Clocking out…' : 'Close break and clock out'}
                    </Button>
                  </>
                )}
                isDismissable={pendingIntent === null}
                isOpen={clockOutConfirmationOpen}
                onOpenChange={(isOpen) => {
                  if (pendingIntent === null || isOpen) setClockOutConfirmationOpen(isOpen);
                }}
                title="Clock out while on break?"
                triggerIsDisabled={pendingIntent !== null || controlsDisabled}
                triggerLabel={label}
                triggerVariant={variant}
              >
                <p className="m-0">
                  WorkLedger will close your active break and clock you out at the same recorded
                  instant. Cancel to leave your attendance unchanged.
                </p>
              </Dialog>
            </div>
          );
        }

        return (
          <form
            key={action}
            aria-busy={isPendingAction}
            onFocusCapture={() => onActionFocus(action)}
            onSubmit={(event) => {
              event.preventDefault();
              if (pendingIntent === null && !controlsDisabled) {
                onAttendanceCommand(action, attendance.attendanceRevision);
              }
            }}
          >
            <Button
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
  if (mode === null) return null;
  if (mode === 'RECONNECTING') {
    return (
      <div className="wl-alert mt-3 rounded-xl border p-3" role="status">
        <p className="m-0 text-sm font-semibold">
          Connection restored. Refreshing current attendance before enabling actions…
        </p>
      </div>
    );
  }
  if (mode === 'OFFLINE') {
    return (
      <div className="wl-alert wl-alert-error mt-3 grid gap-1 rounded-xl border p-3" role="alert">
        <p className="m-0 text-sm font-semibold">You’re offline.</p>
        <p className="m-0 text-sm leading-6">
          Attendance actions are disabled and will not be queued. Reconnect to refresh your current
          status.
        </p>
      </div>
    );
  }
  const requestId = error instanceof ApiClientError ? error.requestId : undefined;
  return (
    <div className="wl-alert wl-alert-error mt-3 grid gap-2 rounded-xl border p-3" role="alert">
      <p className="m-0 text-sm font-semibold">
        WorkLedger could not refresh your current attendance. Actions remain disabled.
      </p>
      {requestId === undefined ? null : (
        <p className="m-0 break-all text-xs">Request reference: {requestId}</p>
      )}
      <div>
        <Button variant="secondary" onPress={retry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

function pendingActionLabel(command: AttendanceCommand): string {
  switch (command) {
    case 'CLOCK_IN':
      return 'Clocking in…';
    case 'START_BREAK':
      return 'Starting break…';
    case 'RESUME':
      return 'Resuming work…';
    case 'CLOCK_OUT':
      return 'Clocking out…';
  }
}
