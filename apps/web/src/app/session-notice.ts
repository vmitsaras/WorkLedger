export type SignInNotice = 'SESSION_EXPIRED' | 'SIGNED_OUT' | 'PASSWORD_RESET';

let pendingNotice: SignInNotice | null = null;

export function setPendingSignInNotice(notice: SignInNotice): void {
  pendingNotice = notice;
}

export function takePendingSignInNotice(): SignInNotice | null {
  const notice = pendingNotice;
  pendingNotice = null;
  return notice;
}
