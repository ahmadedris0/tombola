import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';
import { getDeliveryProvider } from '../../lib/delivery/index';
import { incrementResendCount } from '../../repository/otp-store';

const RESEND_WINDOW_SECONDS = 1800;
const RESEND_MAX = 3;
const kms = new KMSClient({});

interface CustomSmsEvent {
  triggerSource: string;
  request: {
    code: string;
    userAttributes: Record<string, string>;
  };
}

export const handler = async (event: CustomSmsEvent): Promise<CustomSmsEvent> => {
  const phoneE164 = event.request.userAttributes.phone_number!;
  const locale = event.request.userAttributes.locale === 'ar' ? 'ar' : 'en';

  const count = await incrementResendCount(phoneE164, RESEND_WINDOW_SECONDS);
  if (count > RESEND_MAX) {
    throw new Error('OTP resend cap exceeded');
  }

  const decrypted = await kms.send(
    new DecryptCommand({ CiphertextBlob: Buffer.from(event.request.code, 'base64') }),
  );
  const code = Buffer.from(decrypted.Plaintext as Uint8Array).toString('utf-8');

  await getDeliveryProvider(process.env).send({ phoneE164, code, locale });
  return event;
};
