let resetGrant: string | null = null;

export function captureResetGrant(): void {
  const url = new URL(window.location.href);
  if (url.pathname !== '/reset-password') return;
  resetGrant = url.searchParams.get('token');
  if (url.search !== '' || url.hash !== '') {
    window.history.replaceState(window.history.state, '', '/reset-password');
  }
}

export function readResetGrant(): string | null {
  return resetGrant;
}

export function clearResetGrant(): void {
  resetGrant = null;
}
