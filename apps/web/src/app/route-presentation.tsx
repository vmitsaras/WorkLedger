import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  Outlet,
  ScrollRestoration,
  useLocation,
  useMatches,
  useNavigationType,
} from 'react-router';

type RouteHandle = Readonly<{ title?: string }>;
const focusByLocationKey = new Map<string, string>();

export function RoutePresentation() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const matches = useMatches();
  const previousPathname = useRef<string | undefined>(undefined);
  const title = [...matches]
    .reverse()
    .map((match) => match.handle as RouteHandle | undefined)
    .find((handle) => handle?.title !== undefined)?.title;

  useLayoutEffect(() => {
    document.title = title === undefined ? 'WorkLedger' : `${title} | WorkLedger`;
  }, [title]);

  useEffect(() => {
    const updateRememberedFocus = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement) {
        const focusKey = event.target.dataset['routeFocusKey'];
        if (focusKey !== undefined) focusByLocationKey.set(location.key, focusKey);
      }
    };
    document.addEventListener('focusin', updateRememberedFocus);
    return () => document.removeEventListener('focusin', updateRememberedFocus);
  }, [location.key]);

  useEffect(() => {
    const pathnameChanged = previousPathname.current !== location.pathname;
    previousPathname.current = location.pathname;

    // Search-parameter changes are in-page interactions. Keep focus on the
    // filter or pagination control that initiated a PUSH/REPLACE navigation.
    if (!pathnameChanged && navigationType !== 'POP') return;

    const animationFrame = window.requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      const main = document.querySelector<HTMLElement>('#main-content');
      if (activeElement instanceof HTMLElement && main?.contains(activeElement)) {
        return;
      }
      const rememberedKey =
        navigationType === 'POP' ? focusByLocationKey.get(location.key) : undefined;
      const remembered =
        rememberedKey === undefined
          ? undefined
          : [...document.querySelectorAll<HTMLElement>('[data-route-focus-key]')].find(
              (element) => element.dataset['routeFocusKey'] === rememberedKey,
            );
      const target = remembered ?? document.querySelector<HTMLElement>('[data-route-heading]');
      target?.focus({ preventScroll: navigationType === 'POP' });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [location.key, location.pathname, navigationType]);

  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}

export function useBoundaryPresentation(title: string) {
  useEffect(() => {
    document.title = `${title} | WorkLedger`;
  }, [title]);

  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('[data-route-heading]');
    heading?.focus();
  }, [title]);
}
