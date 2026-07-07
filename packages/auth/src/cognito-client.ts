import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
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

export class AuthClient {
  private pool: CognitoUserPool;

  constructor(config: AuthConfig) {
    this.pool = new CognitoUserPool({ UserPoolId: config.userPoolId, ClientId: config.clientId });
  }

  private user(phoneE164: string): CognitoUser {
    return new CognitoUser({ Username: phoneE164, Pool: this.pool });
  }

  signUp(params: SignUpParams): Promise<void> {
    const attrs = [
      new CognitoUserAttribute({ Name: 'name', Value: params.fullName }),
      new CognitoUserAttribute({ Name: 'locale', Value: params.locale }),
      new CognitoUserAttribute({ Name: 'phone_number', Value: params.phoneE164 }),
    ];
    return new Promise((resolve, reject) => {
      this.pool.signUp(params.phoneE164, params.password, attrs, [], (err) =>
        err ? reject(err) : resolve(),
      );
    });
  }

  confirm(phoneE164: string, code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.user(phoneE164).confirmRegistration(code, true, (err) =>
        err ? reject(err) : resolve(),
      );
    });
  }

  resend(phoneE164: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.user(phoneE164).resendConfirmationCode((err) => (err ? reject(err) : resolve()));
    });
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
    return new Promise((resolve, reject) => {
      this.user(phoneE164).forgotPassword({
        onSuccess: () => resolve(),
        onFailure: (err) => reject(err),
      });
    });
  }

  confirmForgotPassword(phoneE164: string, code: string, newPassword: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.user(phoneE164).confirmPassword(code, newPassword, {
        onSuccess: () => resolve(),
        onFailure: (err) => reject(err),
      });
    });
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
