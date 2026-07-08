import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  AdminUpdateUserAttributesCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({});

function clientId(): string {
  return process.env.USER_POOL_CLIENT_ID ?? '';
}
function poolId(): string {
  return process.env.USER_POOL_ID ?? '';
}

export interface CognitoUserInfo {
  sub: string;
  name: string;
  locale: 'en' | 'ar';
}

/** Creates an unconfirmed Cognito user (no SMS is sent — verification is our own OTP). */
export async function cognitoSignUp(
  phoneE164: string,
  password: string,
  fullName: string,
  locale: 'en' | 'ar',
): Promise<void> {
  await client.send(
    new SignUpCommand({
      ClientId: clientId(),
      Username: phoneE164,
      Password: password,
      UserAttributes: [
        { Name: 'name', Value: fullName },
        { Name: 'locale', Value: locale },
        { Name: 'phone_number', Value: phoneE164 },
      ],
    }),
  );
}

/** Confirms the user and marks the phone verified, after our OTP check passes. */
export async function cognitoConfirm(phoneE164: string): Promise<void> {
  await client.send(new AdminConfirmSignUpCommand({ UserPoolId: poolId(), Username: phoneE164 }));
  await client.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: poolId(),
      Username: phoneE164,
      UserAttributes: [{ Name: 'phone_number_verified', Value: 'true' }],
    }),
  );
}

export async function cognitoGetUser(phoneE164: string): Promise<CognitoUserInfo> {
  const res = await client.send(
    new AdminGetUserCommand({ UserPoolId: poolId(), Username: phoneE164 }),
  );
  const attr = (n: string) => res.UserAttributes?.find((a) => a.Name === n)?.Value;
  return {
    sub: attr('sub') ?? '',
    name: attr('name') ?? '',
    locale: attr('locale') === 'ar' ? 'ar' : 'en',
  };
}

export async function cognitoSetPassword(phoneE164: string, newPassword: string): Promise<void> {
  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: poolId(),
      Username: phoneE164,
      Password: newPassword,
      Permanent: true,
    }),
  );
}
