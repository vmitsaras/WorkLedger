import type { ReactNode } from 'react';
import {
  Dialog as ReactAriaDialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components';

import { Button, type ButtonProps } from './button.js';

export type DialogActions = Readonly<{ close: () => void }>;

export interface DialogProps {
  actions?: (actions: DialogActions) => ReactNode;
  children: ReactNode;
  isDismissable?: boolean;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  title: ReactNode;
  triggerIsDisabled?: boolean;
  triggerLabel: ReactNode;
  triggerVariant?: ButtonProps['variant'];
}

export function Dialog({
  actions,
  children,
  isDismissable = true,
  isOpen,
  onOpenChange,
  title,
  triggerIsDisabled = false,
  triggerLabel,
  triggerVariant = 'secondary',
}: DialogProps) {
  return (
    <DialogTrigger
      {...(isOpen === undefined ? {} : { isOpen })}
      {...(onOpenChange === undefined ? {} : { onOpenChange })}
    >
      <Button variant={triggerVariant} isDisabled={triggerIsDisabled}>
        {triggerLabel}
      </Button>
      <ModalOverlay
        isDismissable={isDismissable}
        className="wl-dialog-overlay fixed inset-0 z-50 grid min-h-dvh place-items-center overflow-y-auto bg-[var(--wl-overlay-scrim)] p-4 data-[entering]:animate-[wl-overlay-in_var(--wl-motion-duration-base)_var(--wl-motion-ease-standard)] data-[exiting]:animate-[wl-overlay-out_var(--wl-motion-duration-fast)_var(--wl-motion-ease-standard)]"
      >
        <Modal className="wl-dialog-modal w-full max-w-lg rounded-[var(--wl-radius-dialog)] border border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-6 text-[var(--wl-text)] shadow-[var(--wl-shadow-dialog)] outline-none data-[entering]:animate-[wl-dialog-in_var(--wl-motion-duration-base)_var(--wl-motion-ease-standard)] data-[exiting]:animate-[wl-dialog-out_var(--wl-motion-duration-fast)_var(--wl-motion-ease-standard)]">
          <ReactAriaDialog className="grid gap-5 outline-none">
            {({ close }) => (
              <>
                <div className="grid gap-2">
                  <Heading slot="title" className="text-xl font-bold tracking-[-0.015em]">
                    {title}
                  </Heading>
                  <div className="max-w-prose text-sm leading-6 text-[var(--wl-text-muted)]">
                    {children}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  {actions === undefined ? (
                    <Button onPress={close}>Close</Button>
                  ) : (
                    actions({ close })
                  )}
                </div>
              </>
            )}
          </ReactAriaDialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
