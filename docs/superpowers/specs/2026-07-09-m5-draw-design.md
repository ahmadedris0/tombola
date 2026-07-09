# M5 — Draw & Winner Selection — Design

**Date:** 2026-07-09
**Status:** Approved (decisions stated; autonomous build per [[tombola-workflow]])
**Builds on:** M4 (confirmed/sold numbers) · M2 (admin) · M1 (auth)

M5 is the payoff: an admin draws a tombola, a **CSPRNG** picks the winning number from the
configured pool, an **immutable audit** record is written, the tombola becomes `finished`, and
the winner is published. The draw is **idempotent** — a tombola can't be drawn twice.

## Decisions

- **Endpoint** `POST /admin/tombolas/{id}/draw` (adminJwt). Manual trigger (R-3; auto-at-`drawAt`
  is a future enhancement). Draws a tombola in `active` or `closed`; `finished` → 409 (already
  drawn); other statuses → 400.
- **Pool** (per-tombola `drawPoolMode`): `confirmed_only` (default) → numbers with
  `state=confirmed`; `full_grid` → all `1..gridSize`. Empty confirmed pool → 400 (`no_eligible`).
- **RNG:** `crypto.randomInt(0, pool.length)` (CSPRNG) picks the index → winning number.
  `rngSource = "crypto.randomInt"` recorded.
- **Winner:** the winning number's holder — `winnerUserId`/`winnerName` (masked) if that number
  is `confirmed`, else null (an unsold `full_grid` pick has no holder).
- **Atomic claim + idempotency:** conditionally update the tombola
  (`status ∈ {active,closed} → finished`, set `winningNumber/winnerUserId/winnerName`, flip GSI1
  to `finished`). `ConditionalCheckFailed` → 409 `already_drawn`. This single conditional write
  is the lock, so concurrent/repeat draws are safe.
- **Immutable audit:** write a `DrawAudit` item (`PK=TOMBOLA#<id>`, `SK=DRAW`) with
  `tombolaId, drawnAt, drawnByAdminId, poolSnapshot[], rngSource, winningNumber, winnerUserId,
  winnerName`. Written after the claim succeeds; never updated. Retrievable via
  `GET /admin/tombolas/{id}/draw`.
- **Publish:** finished tombolas expose `winningNumber` + `winnerName`; the grid is read-only.
  `winnerName` added to the shared `Tombola` type.
- **Notifications** are M6 (out of scope here).
- **Frontend.**
  - Admin: a **Run draw** button (with confirmation) on `active`/`closed` tombolas in the list;
    finished rows show the winning number + winner.
  - Web: a **winner banner** (winning number + winner name) atop a finished tombola's detail;
    the grid stays browsable but read-only.

## Exit criteria
1. Admin draws an active tombola with confirmed numbers; a winner is selected via CSPRNG and the
   tombola becomes `finished` with `winningNumber` + `winnerName`.
2. A second draw of the same tombola returns 409 (idempotent); the winner is unchanged.
3. An immutable `DrawAudit` records pool snapshot, RNG source, winning number, and winner.
4. Drawing with no eligible (confirmed) numbers returns 400.
5. Web shows the winner on the finished tombola; admin shows it in the list.
6. Draw endpoint 403 for non-admins / 401 anon.
7. Full local suite green; deployed to dev; SPAs republished.
