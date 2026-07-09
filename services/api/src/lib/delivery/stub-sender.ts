import type { DeliveryProvider, DeliveryParams } from './provider';

/** Dev/test delivery: logs the code. The auth handler persists it for verification/retrieval. */
export class StubSender implements DeliveryProvider {
  async send({ phoneE164, code }: DeliveryParams): Promise<void> {
    console.log(`[StubSender] OTP for ${phoneE164}: ${code}`);
  }
}
