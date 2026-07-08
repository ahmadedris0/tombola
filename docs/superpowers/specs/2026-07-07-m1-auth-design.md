# M1 — Auth — Design

**Date:** 2026-07-07
**Status:** Approved
**Roadmap:** [`2026-07-05-tombola-platform-roadmap-design.md`](2026-07-05-tombola-platform-roadmap-design.md)
**Builds on:** [`2026-07-05-m0-foundation-design.md`](2026-07-05-m0-foundation-design.md)
**Requirements:** [`docs/tombola-brd.md`](../../tombola-brd.md) §5.1, §9

M1 delivers authentication: phone+password registration/login with a WhatsApp-delivered OTP,
password reset, a resend cap, and a profile page — fully bilingual (EN/AR, RTL). Auth is
built on Amazon Cognito with OTP codes routed through a pluggable delivery provider (stub in
dev, WhatsApp once Meta approves the template).

## Implementation update — R-7 pivot (custom OTP store)

The original design used Cognito's **CustomSMSSender** Lambda trigger (+ KMS) to deliver the
OTP. In practice Cognito would not reliably invoke the custom sender (it silently fell back to
SNS), so we adopted the BRD's documented **R-7 alternative: a custom OTP store**. Cognito
remains the identity/password/JWT provider, but OTP generation, storage (DynamoDB with TTL),
verification, and delivery are handled by our own API endpoints
(`/auth/register|verify|resend|forgot|reset`), which call Cognito **admin** APIs
(`SignUp`, `AdminConfirmSignUp`, `AdminSetUserPassword`, …) after our own OTP check. This
removes the CustomSMSSender trigger, KMS key, and `AutoVerifiedAttributes` (and with them the
pool↔Lambda circular-dependency constraint). The `DeliveryProvider` abstraction, resend cap,
phone normalization, error mapping, and all UI are unchanged; only *where* the OTP lifecycle
lives moved from Cognito into our API. The frontend `AuthClient`'s signUp/confirm/resend/
forgot/reset call our API; login/session stay on the Cognito SDK.

---

## 1. Confirmed decisions

| Topic | Decision |
|---|---|
| Auth backend (R-7) | **Cognito** user pool, phone-as-username (E.164), password auth, JWT sessions. |
| OTP delivery trigger | **CustomSMSSender Lambda** (KMS-decrypts the code, never SNS). |
| WhatsApp readiness | Cloud API **credentials ready**; auth-category **template not yet approved**; no confirmed test recipient. |
| Delivery strategy | **`DeliveryProvider` abstraction + `stub` default**, real `whatsapp` behind `OTP_DELIVERY` flag. Template drafted for Meta submission on day one. |
| Auth flow execution | **Client-side Cognito SDK** (`amazon-cognito-identity-js`) for register/confirm/login/reset/resend; our JWT-authorized API only for profile + user mirror. |
| Code sharing | New **`packages/auth`** (framework-agnostic Cognito client, phone util, error→i18n mapping) shared by both apps; React pages live per-app. |
| Admin role | Cognito **`admin` group**; admin app is login-only and group-gated. |
| Profile scope | **Name + preferred language** only; reservation/payment history deferred to M3/M4. |
| Rate limiting (FR-A7) | Rely on Cognito's built-in auth throttling for MVP; the custom **resend cap** (3 / 30 min) is enforced in the CustomSMSSender Lambda. |

---

## 2. Architecture

**Backend (extends `services/api`)**

- **Cognito** user pool + app client (SRP + `USER_PASSWORD_AUTH`), `name`/`locale` attributes,
  `admin` group, phone as username. Defined in `serverless.yml`.
- **KMS key** for CustomSMSSender code encryption; **Secrets Manager** secret holding the
  WhatsApp Cloud API phone-number-id + access token.
- **Lambda triggers:**
  - `CustomSMSSender` — KMS-decrypts the code, enforces the resend cap (DynamoDB counter with
    TTL), calls the selected `DeliveryProvider`.
  - `PostConfirmation` — writes the User mirror item to the single table
    (`USER#<sub>` / `GSI1PK=USER#PHONE#<e164>`), role `user`, `phoneVerified=true`.
  - `PreSignUp` — normalizes/validates the phone to E.164 and blocks duplicates.
- **API handlers (JWT-authorized):** `GET /me`, `PUT /me` (profile: name + locale → updates
  Cognito attributes and the DynamoDB mirror). Dev-only `GET /dev/otp/{phone}` returns the
  last stub code (returns 404/disabled when `OTP_DELIVERY=whatsapp`).
- **HTTP API:** JWT authorizer (issuer = the Cognito user pool) on protected routes; **CORS**
  configured (the M0 follow-up). Admin-only routes additionally require the `admin` group
  claim.

**`packages/auth` (framework-agnostic)**

- Cognito client wrapper (signUp, confirmSignUp, signIn, forgotPassword,
  confirmForgotPassword, resendConfirmationCode, signOut, current session/token refresh).
- Phone normalization to E.164 (default country code `+961`, configurable) — with unit tests.
- Cognito-error → i18n-key mapping (`UsernameExistsException`, `CodeMismatchException`,
  `ExpiredCodeException`, `LimitExceededException`, `NotAuthorizedException`, …).
- Types shared across apps.

**`DeliveryProvider` (in `services/api/src/lib`)**

- Interface `send(params: { phoneE164; code; locale }): Promise<void>`.
- `WhatsAppSender` — reads creds from Secrets Manager; POSTs the authentication-category
  template (with copy-code button) to the Cloud API; WABA registered so Lebanese recipients
  bill domestic.
- `StubSender` — logs the code to CloudWatch and writes it to a DynamoDB item
  (`OTP#<phoneE164>`, short TTL) for the dev retrieve endpoint.
- Selected by `OTP_DELIVERY` (`stub` | `whatsapp`).

**Frontend (each app)**

- `useAuth` React context (session state, login/logout, token access), backed by
  `packages/auth`.
- Public app pages: **Register**, **Verify OTP**, **Login**, **Forgot/Reset password**,
  **Profile**. Admin app: **Login** only (group-gated), plus a minimal authed shell.
- Route guards: authed-only routes redirect guests to login; admin app rejects non-`admin`.
- Mobile-first phone input with local→E.164 normalization; localized EN/AR strings for every
  screen and every mapped error; resend button with a client countdown.

---

## 3. Data flow

**Register:** `signUp(phone, password, {name, locale})` → Cognito fires `CustomSMSSender`
→ Lambda KMS-decrypts the code, checks/increments the resend cap, calls
`DeliveryProvider.send` (stub logs+stores / WhatsApp sends template) → user enters code →
`confirmSignUp(phone, code)` → `PostConfirmation` writes the User mirror → `signIn(phone,
password)` → JWT tokens held by the Cognito SDK (localStorage), refreshed automatically.

**Login:** `signIn(phone, password)` → tokens. **Reset:** `forgotPassword(phone)` → OTP via
the same delivery path → `confirmForgotPassword(phone, code, newPassword)`.

**Resend cap:** every send path funnels through `CustomSMSSender`, which reads a DynamoDB
counter keyed by phone (TTL 30 min); beyond 3 it throws, Cognito surfaces `LimitExceeded`,
the UI shows a localized "too many attempts" message. The client also disables the resend
button for a short countdown after each send.

---

## 4. Error handling

All Cognito exceptions map to localized messages via the shared error→i18n-key table
(no raw AWS error text shown to users). Delivery failures are logged; `StubSender` always
succeeds. `PreSignUp` rejects malformed/duplicate phones with a localized message. The
dev OTP endpoint is hard-disabled unless `OTP_DELIVERY=stub`.

---

## 5. Testing

- **Unit (TDD):** phone normalization (`packages/auth`); resend-cap logic; Cognito-error→key
  mapping; `DeliveryProvider` selection + `WhatsAppSender` request building (mocked fetch);
  React auth pages and route guards (Testing Library, incl. an RTL assertion).
- **Integration (dev stage):** real Cognito `signUp` with `StubSender` → retrieve code from
  `GET /dev/otp/{phone}` → `confirmSignUp` → `signIn` → JWT-authorized `GET/PUT /me`; verify
  an unauthenticated call to a protected route is 401 and a non-admin is rejected from an
  admin route.
- **WhatsApp live send:** manual gate, run once the Meta template is approved and a test
  recipient exists (not part of automated CI).

---

## 6. Out of scope / follow-ups

- Real WhatsApp sends in dev/CI (stub is used); flip `OTP_DELIVERY=whatsapp` after template
  approval.
- SMS fallback (BRD future-only).
- Reservation/payment history in profile (M3/M4).
- Cognito advanced-security / adaptive auth (paid tier) — basic throttling only for MVP.
- First admin account is seeded manually (add a user to the `admin` group) — documented, not
  a UI.

---

## 7. Exit criteria

1. A user registers (name + phone + password), receives an OTP (stub in dev), confirms, and
   logs in.
2. The user edits their name and preferred language; changes persist (Cognito + mirror).
3. Password reset via OTP works end-to-end (stub).
4. The resend cap (3 / 30 min) is enforced server-side and the client shows a countdown.
5. Protected API routes reject unauthenticated requests (401); admin routes reject
   non-admins; an `admin`-group user reaches the admin app.
6. Every auth screen and error works in EN and AR with correct RTL.
7. The Meta authentication-category template text is drafted and handed over for submission.

---

## 8. Next step

Turn this design into a step-by-step implementation plan via the **writing-plans** skill,
then execute task-by-task (subagent-driven).
