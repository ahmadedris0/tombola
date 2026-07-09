# WhatsApp OTP Template (Meta submission)

**Category:** Authentication
**Name:** tombola_otp
**Languages:** en, ar
**Button:** One-time-password copy-code button

**Body (en):** {{1}} is your Tombola verification code.
**Body (ar):** {{1}} هو رمز التحقق الخاص بك في تومبولا.

## Notes

- Register the WABA so Lebanese recipients bill as **domestic** (avoids the ~2–3×
  authentication-international rate).
- The code parameter is passed as the body `{{1}}` and reused as the copy-code button text —
  matches `WhatsAppSender` (`services/api/src/lib/delivery/whatsapp-sender.ts`), which sends
  `template.name = tombola_otp`, `language.code = <en|ar>`, one body text param, and one URL
  button param, both the OTP code.

## Switching from stub to live WhatsApp (after approval)

1. Populate the Secrets Manager secret `tombola/whatsapp/dev` with the real values:
   ```
   aws secretsmanager put-secret-value --secret-id tombola/whatsapp/dev --region eu-west-1 --profile sutoor \
     --secret-string '{"phoneNumberId":"<PNID>","accessToken":"<TOKEN>","templateName":"tombola_otp"}'
   ```
2. Redeploy the API with the delivery flag flipped:
   ```
   OTP_DELIVERY=whatsapp AWS_PROFILE=sutoor pnpm --filter @tombola/api exec serverless deploy --stage dev --region eu-west-1
   ```
   This also disables the dev OTP retrieve endpoint (`GET /dev/otp/{phone}` returns 404 when
   `OTP_DELIVERY=whatsapp`).
