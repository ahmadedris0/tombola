import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});

export interface WhatsAppCreds {
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
}

export async function getWhatsAppCreds(secretId: string): Promise<WhatsAppCreds> {
  const res = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!res.SecretString) throw new Error('WhatsApp secret is empty');
  return JSON.parse(res.SecretString) as WhatsAppCreds;
}
