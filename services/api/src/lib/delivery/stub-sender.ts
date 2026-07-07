import type { DeliveryProvider, DeliveryParams } from './provider';
import { putStubOtp } from '../../repository/otp-store';

export class StubSender implements DeliveryProvider {
  async send({ phoneE164, code }: DeliveryParams): Promise<void> {
    await putStubOtp(phoneE164, code);
    console.log(`[StubSender] OTP for ${phoneE164}: ${code}`);
  }
}
