# M4 — Payments — Design

**Date:** 2026-07-09
**Status:** Approved (decisions stated; autonomous build per [[tombola-workflow]])
**Builds on:** M3 (reservations) · M2 (admin) · M1 (auth)

M4 turns reserved holds into paid, sold numbers. A **Payment** record is created per
reservation (PENDING); admins review a queue and **confirm** (numbers → confirmed/sold, expiry
stops) or **reject** (numbers released). Users can attach a Whish reference to speed review.
Whish settlement itself stays out-of-band (manual). Notifications are M6.

## Decisions

- **Payment record at reserve time.** After a successful reserve, write a Payment
  (`PK=PAYMENT#<id>`, `SK=PAYMENT#<id>`; `GSI1PK=PAYMENT#STATUS#pending`,
  `GSI1SK=<createdAt>#<id>` for the admin queue; `GSI2PK=USER#<sub>`,
  `GSI2SK=PAYMENT#<createdAt>` for user history). Fields: `paymentId, tombolaId, numbers[],
  userId, amount, currency, status, whishReference?, reviewedByAdminId?, reviewedAt?,
  createdAt`. The reserve response now includes `paymentId`. Each reserved **number** also
  carries `paymentId` (linkage for confirm + expiry).
- **Confirm** (`POST /admin/payments/{id}/confirm`, admin): for each number conditionally
  `state=reserved AND ownerUserId=payment.userId → confirmed` (set `confirmedAt`, **remove
  GSI3** so it stops expiring; keep the GSI2 ticket). Payment → `confirmed` (+ reviewer/at),
  **remove GSI1** (leaves the queue).
- **Reject** (`POST /admin/payments/{id}/reject`, admin): release each still-reserved number
  back to `available` (same as cancel), payment → `rejected`, remove GSI1.
- **Expiry ↔ payment.** The 1-minute sweep, when it releases an overdue hold, marks that
  hold's payment `expired` (conditional `status=pending`, remove GSI1) so stale holds leave
  the queue.
- **Proof reference (FR-P3, optional).** `POST /me/payments/{id}/proof` `{whishReference}` —
  conditional on caller ownership + `status=pending`. Screenshot upload (S3) is deferred; a
  text reference covers MVP.
- **User history.** `GET /me/payments` — GSI2 list of the caller's payments with status.
- **Admin queue.** `GET /admin/payments` — GSI1 pending list (with tombola title + numbers).
- **Number lifecycle** reuses `canTransitionNumber` (reserved→confirmed, reserved→available).
- **Frontend.**
  - Web: the payment-instructions sheet gains an optional **Whish reference** input
    (submit → attaches to the payment). Grid shows `confirmed` cells as **Sold**. A **My
    Tickets** page lists the user's numbers with payment status.
  - Admin: a **Payments** queue page — pending list with **Confirm** / **Reject** per payment,
    showing tombola, numbers, amount, user, and any Whish reference. EN/AR + RTL.

## Exit criteria
1. Reserving creates a PENDING payment; it appears in the admin queue.
2. Admin **confirm** flips the numbers to `confirmed` (sold), stops their expiry, and removes
   the payment from the queue; the user sees them as sold.
3. Admin **reject** releases the numbers back to available and marks the payment rejected.
4. An expired hold's payment auto-moves to `expired` (leaves the queue) via the sweep.
5. A user can attach a Whish reference to a pending payment and see it in the queue.
6. Admin endpoints 403 for non-admins / 401 anon; users only see/act on their own payments.
7. Full local suite green; deployed to dev; SPAs republished.
