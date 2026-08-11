import { PASSWORD_MAXIMUM_LENGTH, PASSWORD_MINIMUM_LENGTH } from '@workledger/contracts';

const COMMON_PASSWORDS = new Set([
  '123456789012345',
  'adminadminadmin',
  'changemechangeme',
  'correcthorsebatterystaple',
  'iloveyouiloveyou',
  'letmeinletmeinletmein',
  'passwordpassword',
  'password123456',
  'qwertyqwertyqwerty',
  'welcome123456789',
  'workledgerworkledger',
]);

export { PASSWORD_MAXIMUM_LENGTH, PASSWORD_MINIMUM_LENGTH };

export type PasswordPolicyFailure = 'PASSWORD_TOO_SHORT' | 'PASSWORD_TOO_LONG' | 'PASSWORD_COMMON';

export class PasswordPolicyError extends Error {
  readonly code = 'PASSWORD_POLICY_REJECTED';

  constructor(readonly reason: PasswordPolicyFailure) {
    super('The password does not meet the credential policy.');
    this.name = 'PasswordPolicyError';
  }
}

export function validateCredentialPassword(password: unknown): string {
  if (typeof password !== 'string') throw new PasswordPolicyError('PASSWORD_TOO_SHORT');

  const length = password.length;
  if (length < PASSWORD_MINIMUM_LENGTH) throw new PasswordPolicyError('PASSWORD_TOO_SHORT');
  if (length > PASSWORD_MAXIMUM_LENGTH) throw new PasswordPolicyError('PASSWORD_TOO_LONG');
  if (COMMON_PASSWORDS.has(password.normalize('NFKC').toLocaleLowerCase('en-US'))) {
    throw new PasswordPolicyError('PASSWORD_COMMON');
  }

  return password;
}
