import { createHmac, timingSafeEqual } from 'node:crypto';

const CSRF_CONTEXT = 'workledger-session-csrf-v1';

export function createSessionCsrfToken(sessionToken: string, authSecret: string): string {
  return createHmac('sha256', authSecret)
    .update(CSRF_CONTEXT)
    .update('\0')
    .update(sessionToken)
    .digest('base64url');
}

export function verifySessionCsrfToken(
  candidate: string,
  sessionToken: string,
  authSecret: string,
): boolean {
  const expected = createSessionCsrfToken(sessionToken, authSecret);
  const candidateBytes = Buffer.from(candidate, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');
  return (
    candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes)
  );
}
