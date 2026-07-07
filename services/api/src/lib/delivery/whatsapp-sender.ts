import type { DeliveryProvider, DeliveryParams } from './provider';
import { getWhatsAppCreds } from '../secrets';

const GRAPH_BASE = 'https://graph.facebook.com/v20.0';

export class WhatsAppSender implements DeliveryProvider {
  constructor(private secretId: string) {}

  async send({ phoneE164, code, locale }: DeliveryParams): Promise<void> {
    const creds = await getWhatsAppCreds(this.secretId);
    const res = await fetch(`${GRAPH_BASE}/${creds.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneE164.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: creds.templateName,
          language: { code: locale },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: code }],
            },
          ],
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`WhatsApp send failed: ${res.status} ${await res.text()}`);
    }
  }
}
