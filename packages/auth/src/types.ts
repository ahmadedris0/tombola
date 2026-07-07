export interface AuthConfig {
  userPoolId: string;
  clientId: string;
}

export interface SignUpParams {
  phoneE164: string;
  password: string;
  fullName: string;
  locale: 'en' | 'ar';
}

export interface Session {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  sub: string;
  phoneE164: string;
  fullName: string;
  locale: 'en' | 'ar';
  groups: string[];
}
