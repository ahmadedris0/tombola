# Business Requirements Document — Tombola Web Platform

**Version:** 1.0 (Draft)
**Date:** 2026-07-05
**Owner:** Ahmad
**Purpose:** Implementation-ready requirements to hand to Claude Code for building a bilingual (English / Arabic) online _tombola_ (numbered raffle) platform with manual Whish Money settlement and an admin console.

---

## 1. Overview & Objectives

The platform digitizes the traditional Lebanese _tombola_ card (a 1–100 numbered grid, each number carrying a traditional name label). Instead of a physical card sold "under the cedar," users register, browse available tombolas, and reserve numbers online. Payment is settled out-of-band via **Whish Money** transfer to a phone number; an admin confirms the transfer. When a tombola is drawn, a winning number is selected **randomly** and its holder wins the prize.

**Primary objectives**

- Let users register/sign in with **phone number + password** and reserve numbers in any open tombola.
- Enforce a **time-boxed payment window** (default **60 minutes**): reserve → pay via Whish → admin confirms; unpaid reservations auto-release.
- Support **multiple concurrent tombolas**, each with its own grid, price, prize, and lifecycle (upcoming / active / finished).
- Show **social proof**: on each tombola, display which user holds each number.
- Provide an **admin console** to manage users, tombolas, payments, and draws.
- Ship a **fully bilingual (EN/AR) UI with RTL support**.

---

## 2. Glossary

| Term                 | Meaning                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Tombola**          | A single raffle instance with a fixed grid of numbers (e.g. 1–100), a price per number, a prize, and a lifecycle. |
| **Number / Ticket**  | A single cell in a tombola grid. Has a label (traditional name) and a lifecycle state.                            |
| **Reservation**      | A temporary hold a user places on an available number, pending payment. Expires after the payment window.         |
| **Confirmed / Sold** | A number whose Whish payment has been verified by an admin. Only confirmed numbers are eligible in the draw.      |
| **Whish Money**      | Manual Lebanese money-transfer method. Payment happens outside the app; admin reconciles manually.                |
| **Draw**             | The event that selects a winning number randomly and marks the tombola finished.                                  |

---

## 3. Scope

### 3.1 In scope (MVP)

- Phone+password registration/login; full name captured at signup.
- Public browsing of tombolas; authenticated number reservation.
- Reservation with configurable payment window and auto-expiry.
- Manual Whish payment instructions + admin payment confirmation.
- Random draw + winner display.
- Tombola statuses: upcoming, active, finished (with winner).
- Per-number owner visibility.
- Notifications on key events.
- Admin console (users, tombolas, payments, draws).
- EN/AR i18n with RTL.

### 3.2 Out of scope (MVP)

- Automated/online payment gateways or Whish API auto-reconciliation.
- Refunds automation (handled manually by admin outside the app for MVP).
- Native mobile apps (responsive web only for MVP).
- Provably-fair cryptographic draw proofs (see Future Enhancements).
- Multi-currency (assume single currency, e.g. USD or LBP — configurable per tombola).

---

## 4. Roles

| Role                | Description              | Key permissions                                                                                               |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Guest**           | Unauthenticated visitor. | Browse tombolas and number grids (read-only); cannot reserve.                                                 |
| **Registered User** | Signed-in account.       | Reserve numbers, view own reservations/payment status, see draw results, manage own profile.                  |
| **Admin**           | Operator/back office.    | Full CRUD on tombolas, confirm/reject payments, manually release/assign numbers, trigger draws, manage users. |

> **Open decision (R-1):** Whether guests can browse at all, or must sign in first. Default assumption: public browsing allowed, auth required to reserve.

---

## 5. Functional Requirements

### 5.1 Authentication & Account Management

- **FR-A1** Users register with **full name, phone number, and password**. Phone number is the unique login identifier.
- **FR-A2** Phone numbers stored in E.164 format; UI accepts local Lebanese format and normalizes (default country code **+961**, configurable).
- **FR-A3** Login with phone + password. Standard session/token handling.
- **FR-A4** Verify phone ownership via a **one-time OTP delivered over WhatsApp** (WhatsApp Cloud API) at signup. This is a **confirmed requirement** (channel decision R-5 resolved = WhatsApp). SMS via a third-party provider (e.g. Twilio Verify) is an optional future fallback for the minority without WhatsApp — not built for MVP.
  - **Do not use AWS SNS** for OTP — the production use case was rejected by AWS. This also means Cognito's **native** SMS OTP (which uses SNS internally) must not be relied upon.
  - Implement via Cognito's **Custom SMS Sender Lambda trigger** (`CustomSMSSender`): Cognito hands the code (KMS-encrypted) to the Lambda, which delivers it through the WhatsApp Cloud API instead of SNS. _(If Cognito's phone-as-username constraints prove awkward, a custom OTP store is the alternative — see R-7.)_
  - Use a Meta **authentication-category template** with a copy-code button for the OTP.
  - **OTP resend cap:** limit resends (e.g. max 3 per number per rolling 30 min) with a visible countdown before the resend button re-enables, to control cost and abuse.
- **FR-A5** Password reset flow (via WhatsApp OTP, same delivery path as FR-A4).
- **FR-A6** Profile page: view/update full name and preferred language; view own reservation & payment history.
- **FR-A7** Basic rate limiting / lockout on repeated failed logins.

### 5.2 Tombola Discovery & Detail

- **FR-T1** A **listing page** shows all tombolas grouped/filterable by status: **Upcoming**, **Active**, **Finished**.
- **FR-T2** Each card shows: title, prize, price per number, status, key dates (opens at / draws at), and progress (e.g. "42/100 numbers taken").
- **FR-T3** **Tombola detail page** renders the **number grid** (matching the physical card: 10×10 for a 1–100 grid), where each cell shows:
  - the number,
  - its traditional name **label** (bilingual/optional),
  - a **state color** (available / reserved / confirmed),
  - the **holder's display name** if reserved or confirmed.
- **FR-T4** Available cells are interactive (open reservation flow); non-available cells show holder + state and are not selectable.
- **FR-T5** Finished tombolas display the **winning number and winner** prominently; grid becomes read-only.
- **FR-T6** Upcoming tombolas show a countdown to open time; grid is visible but locked.

### 5.3 Number Selection & Reservation

- **FR-R1** A signed-in user selects one or more **available** numbers in an **active** tombola.
- **FR-R2** Reservation is **atomic**: a number can only be reserved if currently AVAILABLE. Concurrent attempts on the same number must fail safely for the losing user (hard requirement — use conditional writes).
- **FR-R3** On reservation, the number enters **RESERVED** with `reservedAt` and `reservationExpiresAt = reservedAt + reservationWindowMinutes` (default **60**, configurable per tombola).
- **FR-R4** The user immediately sees **payment instructions**: the Whish number (per-tombola or global config), amount due (price × count), and a countdown to expiry.
- **FR-R5** If payment is not confirmed before expiry, the reservation **auto-releases** and the number returns to AVAILABLE.
- **FR-R6** A user can voluntarily cancel their own pending reservation before expiry.
- **FR-R7 (open decision R-2):** Max concurrent pending reservations per user (default: unlimited, but configurable cap recommended to prevent grid hoarding).

### 5.4 Payment (Whish) & Confirmation

- **FR-P1** Payment is **manual/out-of-band**: the user transfers via Whish Money to the configured number, referencing their name/phone.
- **FR-P2** A **PAYMENT** record is created per reservation (PENDING) with amount, user, tombola, and number(s).
- **FR-P3 (optional)** User can submit a Whish transfer reference / screenshot to speed admin reconciliation.
- **FR-P4** Admin reviews pending payments and marks each **CONFIRMED** or **REJECTED**.
- **FR-P5** On CONFIRM, the associated number(s) transition to **CONFIRMED/SOLD** (the expiry timer no longer applies) and the user is notified.
- **FR-P6** On REJECT (or expiry), the number returns to AVAILABLE and the user is notified.
- **FR-P7** The Whish destination number is **configurable** (global default + optional per-tombola override) so it can be set "later" without code changes.

### 5.5 Draw & Winner Selection

- **FR-D1** An admin closes an active tombola and triggers the **draw** (or it auto-triggers at `drawAt` — open decision R-3).
- **FR-D2** The winning number is selected using a **cryptographically secure random** function.
- **FR-D3 (open decision R-4):** Draw pool. Default: draw **only among CONFIRMED numbers** (fair to paying participants). Alternative: draw across the **full grid** and re-draw/void if the number is unsold. The choice must be an admin-configurable setting per tombola.
- **FR-D4** The draw is **logged for audit**: timestamp, admin, eligible pool snapshot, RNG source, chosen number, resulting winner. Immutable once recorded.
- **FR-D5** On draw completion the tombola becomes **FINISHED**; the winning number and winner's name are published; all participants are notified.
- **FR-D6** A tombola cannot be drawn twice; the draw action is idempotent.

### 5.6 Notifications

- **FR-N1** Notify a user on: reservation created (with payment instructions + deadline), **reminder before expiry** (e.g. T-15 min), reservation expired, payment confirmed, payment rejected, and draw result (win/participate).
- **FR-N2** Channel: **in-app** always; plus **WhatsApp Cloud API** as the confirmed external channel (same integration as OTP). SMS is a future-only fallback, not built for MVP. Use utility-category templates for transactional notifications (cheaper than marketing, and free inside an open 24-hour service window).
- **FR-N3** Notifications are localized to the user's preferred language (EN/AR).

### 5.7 Admin Console

- **FR-AD1 Users:** list/search users; view a user's reservations/payments; enable/disable an account; trigger password reset.
- **FR-AD2 Tombolas:** create/edit/duplicate/delete (soft-delete) tombolas. Fields: title, description, grid size (default 100), per-number labels (default traditional names, editable), **price per number** (numeric, e.g. $10), currency, **prize amount** (numeric cash prize, e.g. $400) + optional prize description, Whish number override, reservation window, open time, draw time, draw-pool mode, status. Price and prize are set independently per tombola.
- **FR-AD3 Numbers:** view grid state; **manually release** a reserved number; **manually mark paid**; (optional) manually assign a number to a user for offline sales.
- **FR-AD4 Payments:** queue of PENDING payments with confirm/reject actions and reference/screenshot view.
- **FR-AD5 Draws:** close tombola, run draw, view/publish winner, view audit log.
- **FR-AD6 Dashboard/reports:** per-tombola stats (numbers taken/confirmed, revenue collected, participant count).
- **FR-AD7** All destructive/irreversible admin actions (delete, draw, release) require an explicit confirmation step.

### 5.8 Internationalization (EN / AR)

- **FR-I1** Full UI available in **English and Arabic**; user can switch language; preference persists on the account.
- **FR-I2** **RTL** layout for Arabic (mirrored grid direction to match the physical card's right-to-left numbering).
- **FR-I3** Number labels (traditional names) stored per-locale; Arabic labels default to the physical card.
- **FR-I4 (open decision R-6):** Numeral rendering — Western (1,2,3) vs Arabic-Indic (١,٢,٣) digits in Arabic mode. Default: Western digits everywhere for clarity; configurable.
- **FR-I5** All notification templates localized.

---

## 6. State Machines

### 6.1 Tombola lifecycle

```
DRAFT ──► UPCOMING ──► ACTIVE ──► CLOSED ──► FINISHED
                                   │
                                   └──► CANCELLED (from any pre-FINISHED state)
```

- **DRAFT**: admin editing, not visible to users.
- **UPCOMING**: visible, grid locked, countdown to open.
- **ACTIVE**: reservations open.
- **CLOSED**: reservations locked, awaiting draw (optional intermediate).
- **FINISHED**: drawn, winner published, read-only.
- **CANCELLED**: voided; pending reservations released.

### 6.2 Number lifecycle (within a tombola)

```
AVAILABLE ──reserve──► RESERVED ──admin confirm──► CONFIRMED
   ▲                     │  │
   │       expiry / cancel │  │ admin release
   └─────────────────────┘  │
   ▲                        │
   └────────────────────────┘  (admin release from CONFIRMED, e.g. refund → back to AVAILABLE)
```

- **AVAILABLE → RESERVED**: atomic conditional write only.
- **RESERVED → AVAILABLE**: on expiry, user cancel, admin release, or payment rejection.
- **RESERVED → CONFIRMED**: on admin payment confirmation.
- **CONFIRMED → AVAILABLE**: admin-only (edge case / refund).

---

## 7. Data Model

Entities below are storage-agnostic; a **DynamoDB single-table design** is recommended (aligns with existing stack). Final key/GSI design is an implementation detail for Claude Code.

**User**

- `userId`, `fullName`, `phoneE164` (unique), `passwordHash` _(delegate to Cognito if used)_, `locale` (`en`|`ar`), `role` (`user`|`admin`), `status` (`active`|`disabled`), `phoneVerified`, `createdAt`.

**Tombola**

- `tombolaId`, `title` (localized), `description` (localized), `status`, `gridSize` (default 100), `pricePerNumber` (numeric, e.g. `10`), `currency` (e.g. `USD`), `prizeAmount` (numeric cash prize, e.g. `400`), `prizeDescription` (localized, optional — for non-cash detail or framing), `whishNumberOverride`, `reservationWindowMinutes` (default 60), `drawPoolMode` (`confirmed_only`|`full_grid`), `openAt`, `drawAt`, `winningNumber`, `winnerUserId`, `createdBy`, `createdAt`.

> **Money model:** both `pricePerNumber` and `prizeAmount` are set by the admin **per tombola** — different tombolas can have different prices/prizes. Example: a 1–100 tombola with `pricePerNumber = 10`, `currency = USD`, `prizeAmount = 400`. A user reserving 3 numbers owes 3 × $10 = **$30**; the draw winner receives **$400**.

**Number** (child of Tombola)

- `tombolaId`, `number` (1..gridSize), `labelEn`, `labelAr`, `state` (`available`|`reserved`|`confirmed`), `ownerUserId`, `reservedAt`, `reservationExpiresAt`, `confirmedAt`.

**Payment**

- `paymentId`, `tombolaId`, `numbers[]`, `userId`, `amount`, `currency`, `status` (`pending`|`confirmed`|`rejected`), `whishReference`, `proofUrl`, `reviewedByAdminId`, `reviewedAt`, `createdAt`.

**DrawAudit**

- `tombolaId`, `drawnAt`, `drawnByAdminId`, `poolSnapshot[]`, `rngSource`, `winningNumber`, `winnerUserId`.

**Key access patterns to support**

- List tombolas by status, ordered by date (for listing page).
- List all numbers for a tombola (grid render).
- Atomic reserve of a specific number (conditional on `state = available`).
- List a user's reservations/tickets and payment history.
- **Find reservations past their `reservationExpiresAt`** (for the auto-expiry job).
- List pending payments for the admin queue.

---

## 8. Non-Functional Requirements

- **NFR-1 Concurrency/consistency:** reservation must be atomic; no two users can hold the same number. This is a correctness-critical requirement.
- **NFR-2 Expiry precision:** unpaid reservations must release close to on-time (target ≤ 1 min after expiry). DynamoDB native TTL is too imprecise; use a per-reservation scheduled trigger **or** a 1-minute sweep job (see Architecture).
- **NFR-3 Security:** hashed passwords (or managed IdP), authЗ on all reserve/admin endpoints, admin routes role-gated, input validation, rate limiting on auth and reservation endpoints.
- **NFR-4 Auditability:** draws and admin payment actions are logged immutably.
- **NFR-5 Mobile-first (primary constraint):** Effectively 100% of traffic is mobile. The UI is designed **mobile-first**, then scaled up to tablet/desktop — not the reverse. All flows (browse, reserve, pay-instructions, profile, and the number grid) must be fully usable on a ~360–414px viewport with touch targets ≥44px. The admin console should also be usable on mobile, though desktop is acceptable as its primary surface.
  - **Grid rendering (hard case):** a 10×10 grid of 100 cells, each needing number + label + owner name + state color, does not fit legibly at full detail on a phone. Recommended approach: a compact, horizontally/vertically scrollable (or pinch-zoomable) grid showing number + state color + a truncated owner name, with **tap-to-open a cell detail sheet** (full number, label, owner, state, and the reserve action). Provide a toggle between **grid view** and a **scrollable list view** of numbers. Preserve RTL numbering order in Arabic.
- **NFR-6 Localization:** all user-facing strings externalized; RTL correctness.
- **NFR-7 Availability/scale:** should handle bursts when a popular tombola opens (many users hitting the grid at once).
- **NFR-8 Fairness/transparency:** RNG uses a CSPRNG; draw pool and result are logged and shown.

---

## 9. Recommended Technical Architecture

Tuned to the preferred stack. Claude Code may adjust, but these defaults are recommended:

- **Frontend:** React + Vite + TypeScript, `react-i18next` for EN/AR, RTL-aware styling, responsive grid component. Public site + separate admin area (role-gated routes).
- **Auth:** Amazon Cognito user pool with **phone number as username** and password auth; `name`/`locale` as attributes. Phone verification OTP is delivered via the **Custom SMS Sender Lambda trigger → WhatsApp Cloud API** (NOT SNS — SNS production use was rejected, and Cognito's native SMS path uses SNS, so it must be bypassed). _(Custom password/OTP store is an alternative if Cognito's phone-as-username constraints are undesirable — open decision R-7.)_
- **OTP delivery (WhatsApp):** WhatsApp Cloud API, Meta **authentication-category template** with copy-code button. Register the **WABA so Lebanese recipients bill as domestic** (avoids the ~2–3× "authentication-international" rate). Enforce the OTP resend cap from FR-A4. Reuse this same WhatsApp integration for all app notifications (§5.6).
- **Backend:** AWS serverless — API Gateway + Lambda (Node.js/TypeScript), Serverless Framework.
- **Data:** DynamoDB single-table design with GSIs for the access patterns in §7.
- **Atomic reservation:** DynamoDB `ConditionExpression` on `state = available`.
- **Reservation expiry:** **Option A** — one-off **EventBridge Scheduler** schedule created per reservation, firing an expiry Lambda at `reservationExpiresAt`; **Option B** — a **1-minute EventBridge rule** invoking a sweep Lambda that queries a GSI on `reservationExpiresAt` and releases overdue holds. _Recommend Option B for simplicity/robustness; Option A for precision at low volume._
- **Notifications:** WhatsApp Cloud API (recommended) and/or SNS SMS; in-app via the API. Templated + localized.
- **Draw:** Lambda using `crypto.randomInt`; writes DrawAudit; idempotent guard on tombola status.
- **Payments proof storage (optional):** S3 (pre-signed upload) for Whish screenshots.
- **Hosting:** S3 + CloudFront for the SPA; API behind API Gateway.

---

## 10. Business Rules & Open Decisions

| ID   | Decision needed                                                  | Default assumption                                                                   |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| R-1  | Can guests browse before signing in?                             | Yes, browse public; auth required to reserve.                                        |
| R-2  | Cap on concurrent pending reservations per user?                 | Configurable; default unlimited (recommend a cap).                                   |
| R-3  | Draw trigger: manual admin vs auto at `drawAt`?                  | Manual for MVP; auto as enhancement.                                                 |
| R-4  | Draw pool: confirmed-only vs full grid?                          | Confirmed-only default; per-tombola toggle.                                          |
| R-5  | External notification channel?                                   | **Resolved: WhatsApp** (Cloud API), in-app always-on. SMS is a future fallback only. |
| R-6  | Arabic numerals (Western vs Arabic-Indic)?                       | Western digits.                                                                      |
| R-7  | Auth: Cognito phone-as-username vs custom store?                 | Cognito.                                                                             |
| R-8  | Currency (USD, LBP, other)?                                      | Per-tombola configurable; confirm default.                                           |
| R-9  | Privacy: show full name or first name + initial next to numbers? | Full name (as requested); consider first name + initial.                             |
| R-10 | Whish destination number value                                   | To be provided later; stored in config.                                              |

---

## 11. MVP Definition & Acceptance Criteria

**MVP is complete when:**

1. A user can register (full name + phone + password) and log in.
2. A user can browse tombolas by status and open a grid showing per-number owner + state.
3. A user can reserve an available number atomically and see Whish payment instructions + a live countdown.
4. An unpaid reservation auto-releases at expiry (≤1 min lag) and notifies the user.
5. An admin can confirm a payment, moving the number to CONFIRMED and notifying the user.
6. An admin can create/edit a tombola (incl. price, prize, Whish number, reservation window, labels) and set its status.
7. An admin can run a random draw among the configured pool; the winner is published and logged.
8. The full UI works in EN and AR with correct RTL.
9. Concurrent reservation of the same number is impossible (verified by test).
10. Every user flow is fully usable on a ~360–414px mobile viewport, including the number grid (via tap-to-detail and/or list view).

---

## 12. Risks & Assumptions

- **Regulatory:** selling numbered entries for money with a cash/prize draw may fall under gambling/lottery regulation in Lebanon. Confirm the intended structure (e.g. sponsor-funded prizes / charity framing) before launch; the platform should support a "prize description" that accommodates this. _(Flagged, not resolved here.)_
- **Manual settlement:** Whish reconciliation is manual; admin throughput is the bottleneck at scale — a proof-upload field mitigates this.
- **Phone as identity:** notifications and payment matching rely on accurate phone numbers → OTP verification strongly recommended.
- **Fairness perception:** since draws involve money, the audit log and (later) provably-fair draws protect trust.

---

## 13. Future Enhancements

- Provably-fair draw (commit–reveal seed, public verification).
- Automated Whish reconciliation if/when an API is available.
- Native mobile apps (React Native).
- Auto-draw scheduling, waitlists for sold-out numbers, referral/viral sharing.
- Multi-currency and richer reporting/exports.

---

_End of BRD v1.0. Items marked R-# are open decisions to confirm before or during implementation._
