import { describe, it, expect } from 'vitest';
import { mapCognitoError, AUTH_ERROR_FALLBACK_KEY } from './errors';

describe('mapCognitoError', () => {
  it('maps known Cognito error names to i18n keys', () => {
    expect(mapCognitoError('UsernameExistsException')).toBe('auth.error.usernameExists');
    expect(mapCognitoError('CodeMismatchException')).toBe('auth.error.codeMismatch');
    expect(mapCognitoError('ExpiredCodeException')).toBe('auth.error.expiredCode');
    expect(mapCognitoError('LimitExceededException')).toBe('auth.error.limitExceeded');
    expect(mapCognitoError('NotAuthorizedException')).toBe('auth.error.notAuthorized');
    expect(mapCognitoError('UserNotConfirmedException')).toBe('auth.error.userNotConfirmed');
    expect(mapCognitoError('InvalidPasswordException')).toBe('auth.error.invalidPassword');
    expect(mapCognitoError('UserNotFoundException')).toBe('auth.error.userNotFound');
  });
  it('falls back for unknown errors', () => {
    expect(mapCognitoError('SomeBrandNewException')).toBe(AUTH_ERROR_FALLBACK_KEY);
    expect(mapCognitoError(undefined)).toBe(AUTH_ERROR_FALLBACK_KEY);
  });
});
