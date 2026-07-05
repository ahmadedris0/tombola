# Tombola Platform — Roadmap & Architecture Design

**Date:** 2026-07-05
**Status:** Approved (roadmap level)
**Source of truth for requirements:** [`docs/tombola-brd.md`](../../tombola-brd.md)

This document is the **meta-plan**: it decomposes the Tombola platform (a multi-subsystem
build) into sequenced sub-projects, records the architecture and confirmed decisions, and
defines the initial repository structure. Each milestone below gets its **own** design →
plan → build cycle. This roadmap does not restate the BRD; it references it.

---

## 1. Confirmed decisions

| Topic | Decision | Notes |
|---|---|---|
| First build target | **Full cloud build from day one** | Real AWS + WhatsApp Business provisioned; provisioning is on the critical path. |
| IaC | **Serverless Framework v3** | Per BRD recommendation; v3 pinned (stable/free, avoids v4 licensing). |
| AWS region | **eu-west-1 (Ireland)** | Primary deploy target. |
| Repo/CI | **Local only for now** | pnpm monorepo; no remote/CI yet — local scripts + `serverless deploy`. Add CI later. |
| Repo shape | **pnpm monorepo** | Public SPA + admin SPA + one Serverless service + shared package. |
| Auth | **Cognito, phone-as-username + password** | OTP via **Custom SMS Sender Lambda → WhatsApp Cloud API**. **Never SNS** (production use rejected; Cognito native SMS bypassed). |
| Public name display (R-9) | **First name + last initial** (e.g. "Ahmad E.") publicly | Full name visible to admins only. |
| Default currency (R-8) | **USD** | Per-tombola configurable. |
| Guest browsing (R-1) | **Yes**, public browse; auth required to reserve | |
| Reservation cap (R-2) | **Configurable, default 10** concurrent pending per user | |
| Draw trigger (R-3) | **Manual admin** for MVP | Auto-at-`drawAt` is a future enhancement. |
| Draw pool (R-4) | **Confirmed-only** default | Per-tombola toggle to full-grid. |
| Numerals (R-6) | **Western digits** everywhere | Configurable later. |
| Whish number (R-10) | Stored in config, provided later | Global default + per-tombola override. |

**Cross-cutting (applied in every milestone, not a phase):** EN/AR i18n with correct RTL,
and mobile-first UI (usable at 360–414px, touch targets ≥44px, NFR-5).

---

## 2. Architecture

**pnpm monorepo**, all TypeScript.

- `apps/web` — public SPA (React + Vite + TS, react-i18next, RTL-aware). Browse, reserve,
  payment instructions, profile.
- `apps/admin` — separate role-gated admin SPA. Users, tombolas, numbers, payments, draws,
  dashboard. Kept separate so the admin bundle never ships to public users.
- `services/api` — one Serverless Framework service (API Gateway + Lambda, Node.js/TS).
- `packages/shared` — TS types, Zod schemas, i18n message keys, and **pure state-machine
  logic** (tombola + number lifecycles). Consumed by both Lambda and React so validation and
  transitions are defined once — directly serving the correctness-critical atomic-reserve
  requirement (NFR-1).
- `infra/` — cross-cutting IaC resources referenced by the service (Cognito user pool +
  custom triggers, DynamoDB table, CloudFront/S3 for SPAs).

**Data:** DynamoDB single-table design with GSIs for the §7 BRD access patterns (list
tombolas by status/date; list numbers per tombola; atomic reserve conditional on
`state=available`; user reservations/payments; overdue reservations for the expiry sweep;
pending payments queue). Final key/GSI schema is designed in M0.

**Atomic reservation:** DynamoDB `ConditionExpression` on `state = available`.

**Reservation expiry:** EventBridge **1-minute sweep** rule (BRD Option B) querying a GSI on
`reservationExpiresAt` — chosen for simplicity/robustness; target ≤1 min lag (NFR-2).

**Draw:** Lambda using `crypto.randomInt`; writes immutable `DrawAudit`; idempotent guard on
tombola status (FR-D6).

**Notifications:** in-app (via API) always; WhatsApp Cloud API utility-category templates,
reusing the M1 OTP integration. Localized EN/AR.

---

## 3. Milestone roadmap

Sequenced vertical slices. M0→M3 are the backbone. M1's external WhatsApp template approval
is submitted **on day one** and runs in parallel so it never blocks.

- **M0 — Foundation.** Monorepo scaffold, Serverless service skeleton, DynamoDB single-table
  design + GSIs, shared types/Zod, i18n scaffolding (react-i18next + RTL), local deploy to a
  dev AWS stage (eu-west-1), CloudFront/S3 SPA hosting. See
  [`2026-07-05-m0-foundation-design.md`](2026-07-05-m0-foundation-design.md).
  *Exit: empty-but-deployed skeleton with a health endpoint, local checks + AWS dev stage green.*
- **M1 — Auth.** Cognito phone-as-username, Custom SMS Sender Lambda → WhatsApp OTP,
  register/login/reset, resend cap (max 3 / 30 min with countdown), profile + language pref.
  *Exit: a real user signs up via WhatsApp OTP and logs in.*
- **M2 — Tombola discovery + admin CRUD.** Listing by status; detail grid with mobile
  grid/list toggle + tap-to-open cell detail sheet; admin create/edit/duplicate/soft-delete;
  per-number label seeding (traditional names, editable, per-locale).
  *Exit: admin creates a tombola; users browse the grid on mobile.*
- **M3 — Reservation engine.** Atomic conditional-write reserve; payment-instructions view +
  live countdown; EventBridge 1-min expiry sweep; voluntary cancel; reservation cap.
  *Exit: reserve → countdown → auto-release, with a concurrency test proving no double-hold
  (NFR-1, acceptance §11.9).*
- **M4 — Payments.** PENDING payment records; optional Whish proof upload (S3 pre-signed);
  admin confirm/reject queue → CONFIRMED/SOLD or release; user notified.
  *Exit: admin confirms a payment; the number locks as sold.*
- **M5 — Draw.** CSPRNG draw among the configured pool (confirmed-only default); immutable
  DrawAudit; idempotent; winner published; tombola → FINISHED.
  *Exit: admin runs an auditable draw; winner shown, grid read-only.*
- **M6 — Notifications.** In-app feed + WhatsApp utility templates; T-15 expiry reminder;
  full lifecycle events; all localized EN/AR.
  *Exit: user is notified across the full reservation/payment/draw lifecycle.*
- **M7 — Hardening.** Rate limiting/lockout (NFR-3), load/burst test (NFR-7), full RTL/i18n
  audit, security review, production stage.
  *Exit: all MVP acceptance criteria (BRD §11) pass.*

---

## 4. Initial project structure (M0 target)

```
tombola/
├── docs/
│   ├── tombola-brd.md
│   └── superpowers/specs/          # design docs per milestone
├── apps/
│   ├── web/                        # public SPA (React+Vite+TS, i18next, RTL)
│   │   └── src/{routes,components,grid,i18n,api}/
│   └── admin/                      # admin SPA (role-gated)
│       └── src/{routes,components,i18n,api}/
├── services/
│   └── api/                        # Serverless Framework service
│       ├── serverless.yml
│       └── src/
│           ├── handlers/           # auth, tombolas, reservations, payments, draws, notifications
│           ├── domain/             # state machines, reserve logic (pure, tested)
│           ├── repository/         # DynamoDB single-table access
│           └── lib/                # cognito, whatsapp, s3, eventbridge
├── packages/
│   └── shared/                     # TS types, Zod schemas, i18n keys, state-machine constants
├── infra/                          # cross-cutting IaC (Cognito custom triggers, DynamoDB, CloudFront)
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

---

## 5. Next step

Brainstorm **M0 (Foundation)** in detail → its own design doc → implementation plan via the
writing-plans skill. Subsequent milestones follow the same cycle.
