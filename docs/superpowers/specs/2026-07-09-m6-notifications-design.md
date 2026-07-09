# M6 — Notifications — Design

**Date:** 2026-07-09
**Status:** Approved (decisions stated; autonomous build per [[tombola-workflow]])
**Builds on:** M3–M5 (reservation/payment/draw lifecycle) · M1 (delivery abstraction)

M6 notifies users across the lifecycle: reservation created (with instructions + deadline),
**T-15 expiry reminder**, reservation expired, payment confirmed/rejected, and draw result
(win/participate). **In-app** is the always-on channel (built fully here); **WhatsApp** reuses
the M1 delivery path but stays **stubbed/logged** until the Meta utility templates are approved.

## Decisions

- **In-app store.** One item per notification: `PK=USER#<uid>`, `SK=NOTIF#<createdAt>#<rand>`
  (ISO sort = chronological), fields `type, params, createdAt, ttl` (30-day TTL). Query newest-
  first. Messages are stored as a **type + params** and rendered client-side via i18n, so they
  display in the user's current language.
- **Unread via marker.** `notifLastReadAt` on the user mirror; unread = notifications newer
  than it. `GET /me/notifications` → `{ notifications, lastReadAt }`; `POST /me/notifications/read`
  sets it to now. Avoids per-item writes.
- **`notify(userId, type, params)` helper** writes the in-app item and logs the WhatsApp intent
  (real send is behind the existing `OTP_DELIVERY`/template gate — off until templates approve).
- **Event wiring:**
  - reserve → `reservation_created` (numbers, amount, currency, deadline).
  - admin confirm/reject → `payment_confirmed` / `payment_rejected`.
  - sweep → `reservation_expired` for each released hold; **`expiry_reminder`** for holds
    entering the T-15 window (once, via a `reminded` flag set conditionally).
  - draw → `draw_won` to the winner + `draw_result` to each distinct confirmed participant.
- **Sweep extension.** The 1-min sweep now also runs a reminder pass: query GSI3 for holds
  expiring within the next 15 min, still `reserved`, `attribute_not_exists(reminded)` → notify
  and set `reminded`.
- **Frontend (web).** A header **bell** with an unread count; a notifications panel/page listing
  localized messages (rendered from `type` + `params`), newest first; opening it marks read.
  EN/AR + RTL.
- **Admin** is out of scope for notifications (operators use the queues directly).

## Exit criteria
1. Reserving, confirming, rejecting, expiring, and drawing each create an in-app notification
   for the affected user(s).
2. A user sees their notifications newest-first with a correct unread count; opening marks read.
3. The T-15 reminder fires once per hold entering the window (no duplicates).
4. Notifications render localized in EN and AR.
5. `GET /me/notifications` is auth-gated (401 anon); users only see their own.
6. Full local suite green; deployed to dev; web SPA republished. WhatsApp remains stubbed
   (logged), documented as a template-approval flip.
