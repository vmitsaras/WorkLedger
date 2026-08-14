let resetGrant: string | null = null;
let invitationGrant: string | null = null;

export function captureResetGrant(): void {
  const url = new URL(window.location.href);
  if (url.pathname === '/reset-password') resetGrant = url.searchParams.get('token');
  else if (url.pathname === '/activate-account') invitationGrant = url.searchParams.get('token');
  else return;
  if (url.search !== '' || url.hash !== '') {
    window.history.replaceState(window.history.state, '', url.pathname);
  }
}

export function readResetGrant(): string | null {
  return resetGrant;
}

export function clearResetGrant(): void {
  resetGrant = null;
}

export function readInvitationGrant(): string | null {
  return invitationGrant;
}

export function clearInvitationGrant(): void {
  invitationGrant = null;
}
