import type { AuthConfig } from '@tombola/auth';

export const authConfig: AuthConfig = {
  userPoolId: import.meta.env.VITE_USER_POOL_ID,
  clientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
};

export const apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL;
