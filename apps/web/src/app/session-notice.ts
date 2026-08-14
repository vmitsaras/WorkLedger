export type SignInNotice =
  'ACCOUNT_ACTIVATED' | 'SESSION_EXPIRED' | 'SIGNED_OUT' | 'PASSWORD_RESET';

let pendingNotice: SignInNotice | null = null;

export function setPendingSignInNotice(notice: SignInNotice): void {
  pendingNotice = notice;
}

export function readPendingSignInNotice(): SignInNotice | null {
  return pendingNotice;
}

export function clearPendingSignInNotice(notice: SignInNotice): void {
  if (pendingNotice === notice) pendingNotice = null;
}
