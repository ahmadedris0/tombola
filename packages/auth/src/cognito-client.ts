import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import type { AuthConfig, SignUpParams, Session, AuthUser } from './types';

function toSession(s: CognitoUserSession): Session {
  return {
    idToken: s.getIdToken().getJwtToken(),
    accessToken: s.getAccessToken().getJwtToken(),
    refreshToken: s.getRefreshToken().getToken(),
  };
}

/** POSTs JSON to our auth API; throws an Error whose `.name` is the server error code. */
async function authApi(baseUrl: string, path: string, body: unknown): Promise<void> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let code = 'GenericError';
    try {
      code = ((await res.json()) as { error?: string }).error ?? code;
    } catch {
      // non-JSON error body; keep generic
    }
    const err = new Error(code);
    err.name = code;
    throw err;
  }
}

export class AuthClient {
  private pool: CognitoUserPool;
  private apiBaseUrl: string;

  constructor(config: AuthConfig) {
    this.pool = new CognitoUserPool({ UserPoolId: config.userPoolId, ClientId: config.clientId });
    this.apiBaseUrl = config.apiBaseUrl;
  }

  private user(phoneE164: string): CognitoUser {
    return new CognitoUser({ Username: phoneE164, Pool: this.pool });
  }

  // Registration + OTP flows go through our API (self-managed OTP store), not Cognito SMS.
  signUp(params: SignUpParams): Promise<void> {
    return authApi(this.apiBaseUrl, '/auth/register', {
      fullName: params.fullName,
      phoneE164: params.phoneE164,
      password: params.password,
      locale: params.locale,
    });
  }

  confirm(phoneE164: string, code: string): Promise<void> {
    return authApi(this.apiBaseUrl, '/auth/verify', { phoneE164, code });
  }

  resend(phoneE164: string): Promise<void> {
    return authApi(this.apiBaseUrl, '/auth/resend', { phoneE164 });
  }

  signIn(phoneE164: string, password: string): Promise<Session> {
    const user = this.user(phoneE164);
    const details = new AuthenticationDetails({ Username: phoneE164, Password: password });
    return new Promise((resolve, reject) => {
      user.authenticateUser(details, {
        onSuccess: (s) => resolve(toSession(s)),
        onFailure: (err) => reject(err),
      });
    });
  }

  forgotPassword(phoneE164: string): Promise<void> {
    return authApi(this.apiBaseUrl, '/auth/forgot', { phoneE164 });
  }

  confirmForgotPassword(phoneE164: string, code: string, newPassword: string): Promise<void> {
    return authApi(this.apiBaseUrl, '/auth/reset', { phoneE164, code, newPassword });
  }

  signOut(): void {
    this.pool.getCurrentUser()?.signOut();
  }

  currentSession(): Promise<Session | null> {
    const user = this.pool.getCurrentUser();
    if (!user) return Promise.resolve(null);
    return new Promise((resolve) => {
      user.getSession((err: Error | null, s: CognitoUserSession | null) => {
        resolve(err || !s ? null : toSession(s));
      });
    });
  }

  currentUser(): Promise<AuthUser | null> {
    const user = this.pool.getCurrentUser();
    if (!user) return Promise.resolve(null);
    return new Promise((resolve) => {
      user.getSession((err: Error | null, s: CognitoUserSession | null) => {
        if (err || !s) return resolve(null);
        const payload = s.getIdToken().decodePayload();
        resolve({
          sub: String(payload.sub ?? ''),
          phoneE164: String(payload.phone_number ?? ''),
          fullName: String(payload.name ?? ''),
          locale: payload.locale === 'ar' ? 'ar' : 'en',
          groups: Array.isArray(payload['cognito:groups']) ? payload['cognito:groups'] : [],
        });
      });
    });
  }
}
