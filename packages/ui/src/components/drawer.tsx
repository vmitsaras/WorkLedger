import type { ReactNode } from 'react';
import {
  Dialog as ReactAriaDialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components';

import { Button } from './button.js';

export interface DrawerProps {
  children: ReactNode | ((close: () => void) => ReactNode);
  title: ReactNode;
  triggerLabel: ReactNode;
}

export function Drawer({ children, title, triggerLabel }: DrawerProps) {
  return (
    <DialogTrigger>
      <Button variant="secondary">{triggerLabel}</Button>
      <ModalOverlay
        isDismissable
        className="wl-dialog-overlay fixed inset-0 z-50 flex min-h-dvh bg-[color-mix(in_oklab,var(--wl-text)_35%,transparent)] data-[entering]:animate-[wl-overlay-in_var(--wl-motion-duration-base)_var(--wl-motion-ease-standard)] data-[exiting]:animate-[wl-overlay-out_var(--wl-motion-duration-fast)_var(--wl-motion-ease-standard)]"
      >
        <Modal className="wl-dialog-modal min-h-dvh w-[min(22rem,calc(100%-2rem))] overflow-y-auto border-r border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-5 text-[var(--wl-text)] shadow-[var(--wl-shadow-dialog)] outline-none data-[entering]:animate-[wl-drawer-in_var(--wl-motion-duration-base)_var(--wl-motion-ease-standard)] data-[exiting]:animate-[wl-drawer-out_var(--wl-motion-duration-fast)_var(--wl-motion-ease-standard)]">
          <ReactAriaDialog className="grid min-h-full content-start gap-5 outline-none">
            {({ close }) => (
              <>
                <div className="flex items-center justify-between gap-4">
                  <Heading slot="title" className="m-0 text-xl font-bold tracking-[-0.015em]">
                    {title}
                  </Heading>
                  <Button variant="quiet" onPress={close}>
                    Close
                  </Button>
                </div>
                {typeof children === 'function' ? children(close) : children}
              </>
            )}
          </ReactAriaDialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
