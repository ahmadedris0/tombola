export const AUTH_ERROR_FALLBACK_KEY = 'auth.error.generic';

const MAP: Record<string, string> = {
  UsernameExistsException: 'auth.error.usernameExists',
  CodeMismatchException: 'auth.error.codeMismatch',
  ExpiredCodeException: 'auth.error.expiredCode',
  LimitExceededException: 'auth.error.limitExceeded',
  TooManyRequestsException: 'auth.error.limitExceeded',
  NotAuthorizedException: 'auth.error.notAuthorized',
  UserNotConfirmedException: 'auth.error.userNotConfirmed',
  InvalidPasswordException: 'auth.error.invalidPassword',
  InvalidParameterException: 'auth.error.invalidParameter',
  UserNotFoundException: 'auth.error.userNotFound',
};

export function mapCognitoError(name: string | undefined): string {
  if (name && Object.hasOwn(MAP, name)) return MAP[name]!;
  return AUTH_ERROR_FALLBACK_KEY;
}
