# M2 — Tombola Discovery + Admin CRUD — Design

**Date:** 2026-07-09
**Status:** Approved (decisions stated; autonomous build per [[tombola-workflow]])
**Roadmap:** [`2026-07-05-tombola-platform-roadmap-design.md`](2026-07-05-tombola-platform-roadmap-design.md)
**Builds on:** M0 (single table) + M1 (auth, admin group, JWT authorizer)

M2 adds tombola content: a public listing by status, a mobile-first number grid, and an
admin console to create/edit/duplicate/soft-delete tombolas with seeded per-number labels.
No reservations/payments/draws yet (M3+), so numbers render as `available` and the reserve
action is a disabled placeholder.

## Decisions

- **Data (reuses the single table):**
  - Tombola metadata — `PK=TOMBOLA#<id>`, `SK=TOMBOLA#<id>`; listing via
    `GSI1PK=TOMBOLA#STATUS#<status>`, `GSI1SK=<openAtOrCreatedAt>#<id>`. Soft-delete sets
    `deletedAt` and clears the GSI1 keys so it drops out of all status listings.
  - Number — `PK=TOMBOLA#<id>`, `SK=NUMBER#<nnn>` (zero-padded), attrs `number/labelEn/labelAr/
    state`. Seeded `state=available`, labels default to the Western-digit number string
    (R-6), admin-editable.
- **Endpoints**
  - Public: `GET /tombolas` (visible statuses only — upcoming/active/finished, grouped),
    `GET /tombolas/{id}`, `GET /tombolas/{id}/numbers`.
  - Admin (JWT + `admin` group): `GET /admin/tombolas` (all incl. draft), `POST /admin/tombolas`
    (create + seed numbers), `PUT /admin/tombolas/{id}`, `POST /admin/tombolas/{id}/duplicate`
    (→ new id, status `draft`, labels copied), `DELETE /admin/tombolas/{id}` (soft-delete),
    `PUT /admin/tombolas/{id}/numbers/{n}` (edit labels).
  - Admin gating: `requireAdmin(event)` reads `cognito:groups` from the JWT claims (handles
    both array and string forms) → 403 if not admin.
- **Money/config fields** per BRD §7 (price, currency default USD, prize, whish override,
  reservation window default 60, drawPoolMode `confirmed_only`, openAt/drawAt, gridSize 100).
- **Frontend**
  - Public listing (`/tombolas`): cards grouped Upcoming / Active / Finished with title, prize,
    price, dates, and progress (`taken/total`; taken=0 until M3). Guests can browse (R-1).
  - Detail (`/tombolas/:id`): responsive number grid (10 wide for 100), each cell = number +
    state color; **grid/list toggle**; tap a cell → bottom **detail sheet** (number, label,
    holder [none yet], state, disabled "reserve — coming soon"). RTL mirrors the grid.
  - Admin: tombola list + create/edit form (all config fields) + duplicate + soft-delete.
    Per-number label bulk-editing UI is deferred (the seed defaults + edit endpoint exist);
    metadata CRUD is the M2 admin surface.
- **Validation:** Zod input schemas in `@tombola/shared` (create/update), reused by API + UI.

## Exit criteria
1. Admin creates a tombola (with price/prize/labels/window/status); it seeds N numbers.
2. Admin edits, duplicates, and soft-deletes tombolas; soft-deleted ones vanish from public
   and admin-active listings.
3. Guests/users browse tombolas by status and open a mobile grid (grid + list views) with a
   working cell detail sheet, in EN/AR + RTL.
4. Public endpoints never expose draft/deleted tombolas; admin endpoints are 403 for
   non-admins and 401 for anonymous.
5. Full local suite green (unit tests for repo, handlers incl. admin gating, seeding, grid
   components); deployed to dev; web SPA republished.
