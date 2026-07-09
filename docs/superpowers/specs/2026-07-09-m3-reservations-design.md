# M3 — Reservation Engine — Design

**Date:** 2026-07-09
**Status:** Approved (decisions stated; autonomous build per [[tombola-workflow]])
**Builds on:** M0 (single table + GSIs) · M1 (auth/JWT) · M2 (tombolas + grid)

M3 makes grid cells reservable: atomic conditional-write holds, payment instructions with a
live countdown, voluntary cancel, a per-user pending cap, and a 1-minute expiry sweep that
auto-releases unpaid holds. Payment *records* + admin confirmation are M4; notifications are
M6 — M3 shows instructions inline and relies on the countdown.

## Decisions

- **Reserve (atomic).** `POST /tombolas/{id}/reserve` (JWT, phone pool) with `{numbers:[…]}`.
  Uses **`TransactWriteItems`** — one conditional `Update` per number
  (`ConditionExpression: state = available`) so the whole request is all-or-nothing. On
  `TransactionCanceledException`, the conflicting numbers are parsed from `CancellationReasons`
  → **409** with `{conflicts:[…]}`. Success sets `state=reserved`, `ownerUserId`, `ownerName`
  (masked "First L." from the JWT `name` claim — social proof without a lookup), `reservedAt`,
  `reservationExpiresAt = now + tombola.reservationWindowMinutes`, plus GSI2 (user tickets) and
  GSI3 (expiry) keys. Tombola must be `active` (else 400).
- **Pending cap.** Global default **10** concurrent pending reservations per user
  (`RESERVATION_CAP` env), counted via GSI2 (`USER#<sub>`, `TICKET#`). Over cap → 400.
- **Cancel.** `POST /tombolas/{id}/cancel` `{numbers:[…]}` — conditional release of the
  caller's own `reserved` numbers (`owner = sub AND state = reserved`) back to `available`,
  clearing owner/timers/GSI2/GSI3.
- **My reservations.** `GET /me/reservations` — GSI2 query of the caller's held numbers
  (number, tombolaId, expiry) for profile/history.
- **Expiry sweep.** EventBridge `rate(1 minute)` → sweep Lambda queries GSI3
  (`GSI3PK=RESERVATION_EXPIRY`, `GSI3SK < nowIso`) and conditionally releases each still-
  `reserved` overdue hold (target ≤1 min lag, NFR-2). Uses release, not TTL delete.
- **Payment instructions (display only).** Reserve responds with `{whishNumber, amount:
  price×count, currency, reservationExpiresAt, numbers}`. `whishNumber =
  tombola.whishNumberOverride || WHISH_NUMBER env || "TBD"` (R-10 value provided later).
- **Number lifecycle** reuses `canTransitionNumber` from `@tombola/shared`; `maskName` added to
  shared.
- **Frontend.** Grid cells show state color + masked holder name; only `available` cells open
  the reserve action (guests → redirect to login). After reserve, a **PaymentInstructions**
  panel shows the Whish number, amount, a live **countdown** to expiry, and a **Cancel**
  button. EN/AR + RTL.

## Exit criteria
1. An authed user reserves an available number; it flips to `reserved` with a 60-min expiry and
   shows Whish instructions + countdown.
2. Concurrent reserves of the same number: exactly one succeeds, the other gets 409
   (verified by a live concurrency test — NFR-1).
3. Voluntary cancel releases the hold back to available.
4. An unpaid hold auto-releases within ~1 min of expiry via the sweep.
5. The pending cap blocks a user past the limit.
6. Guests can browse but not reserve; reserve requires auth.
7. Full local suite green; deployed to dev; web SPA republished.
