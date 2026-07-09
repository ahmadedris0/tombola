import { describe, it, expect, vi } from 'vitest';
import { WhatsAppSender } from './whatsapp-sender';

vi.mock('../secrets', () => ({
  getWhatsAppCreds: vi.fn().mockResolvedValue({
    phoneNumberId: 'PNID',
    accessToken: 'TOKEN',
    templateName: 'tombola_otp',
  }),
}));

describe('WhatsAppSender', () => {
  it('POSTs an authentication-template message to the Cloud API', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    await new WhatsAppSender('secret-id').send({
      phoneE164: '+96170123456',
      code: '123456',
      locale: 'ar',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/PNID/messages');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer TOKEN');
    const body = JSON.parse(init.body as string);
    expect(body.to).toBe('96170123456'); // no leading +
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('tombola_otp');
    expect(body.template.language.code).toBe('ar');
    expect(body.template.components[0].parameters[0].text).toBe('123456');
  });

  it('throws on a non-2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad', { status: 400 }));
    await expect(
      new WhatsAppSender('secret-id').send({ phoneE164: '+96170123456', code: '1', locale: 'en' }),
    ).rejects.toThrow();
  });
});
