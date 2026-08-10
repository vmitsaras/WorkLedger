import type { ReactNode } from 'react';
import {
  Dialog as ReactAriaDialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components';

import { Button } from './button.js';

export interface DialogProps {
  children: ReactNode;
  title: ReactNode;
  triggerLabel: ReactNode;
}

export function Dialog({ children, title, triggerLabel }: DialogProps) {
  return (
    <DialogTrigger>
      <Button variant="secondary">{triggerLabel}</Button>
      <ModalOverlay
        isDismissable
        className="wl-dialog-overlay fixed inset-0 z-50 grid min-h-dvh place-items-center overflow-y-auto bg-[color-mix(in_oklab,var(--wl-text)_35%,transparent)] p-4 data-[entering]:animate-[wl-overlay-in_var(--wl-motion-duration-base)_var(--wl-motion-ease-standard)] data-[exiting]:animate-[wl-overlay-out_var(--wl-motion-duration-fast)_var(--wl-motion-ease-standard)]"
      >
        <Modal className="wl-dialog-modal w-full max-w-lg rounded-2xl border border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-6 text-[var(--wl-text)] shadow-[var(--wl-shadow-dialog)] outline-none data-[entering]:animate-[wl-dialog-in_var(--wl-motion-duration-base)_var(--wl-motion-ease-standard)] data-[exiting]:animate-[wl-dialog-out_var(--wl-motion-duration-fast)_var(--wl-motion-ease-standard)]">
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
                <div className="flex justify-end">
                  <Button onPress={close}>Close</Button>
                </div>
              </>
            )}
          </ReactAriaDialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
