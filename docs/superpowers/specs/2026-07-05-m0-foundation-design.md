# M0 — Foundation — Design

**Date:** 2026-07-05
**Status:** Approved
**Roadmap:** [`2026-07-05-tombola-platform-roadmap-design.md`](2026-07-05-tombola-platform-roadmap-design.md)
**Requirements:** [`docs/tombola-brd.md`](../../tombola-brd.md)

M0 stands up the monorepo skeleton, the deployable serverless service, the DynamoDB
single-table + GSIs, the shared package, and both React SPAs with working EN/AR + RTL — with
**no domain logic** (auth, tombola, reservation, payment, draw are M1+). The goal is a
skeleton that deploys and proves the cross-cutting concerns (i18n/RTL, mobile-first tooling)
work end to end.

---

## 1. Scope

**In scope**
- pnpm monorepo tooling, TypeScript project references, Vitest, ESLint + Prettier.
- Serverless Framework **v3** service deploying to a `dev` stage in **eu-west-1**, with a
  working `GET /health`.
- DynamoDB single-table + 3 GSIs provisioned via `serverless.yml`.
- `packages/shared`: entity types, Zod schemas, i18n message-key definitions, and pure
  state-machine functions (unit-tested).
- `apps/web` + `apps/admin`: Vite + React + TS, Tailwind (logical properties), react-i18next
  with EN/AR, working language switcher that flips `dir=rtl` and persists to localStorage.
- S3 + CloudFront hosting for both SPAs.
- Local deploy scripts.

**Out of scope (later milestones)**
- Any real auth/Cognito, tombola CRUD, reservation, payment, draw, or notification logic.
- Remote git host / CI (local only for now).
- Account-level language persistence (needs M1 auth; localStorage stand-in for now).

---

## 2. Monorepo tooling

- **pnpm** workspaces (`pnpm-workspace.yaml`): `apps/*`, `services/*`, `packages/*`.
- **Node 20 LTS**.
- **TypeScript** project references; shared `tsconfig.base.json`.
- **Vitest** for unit tests (front + back); **ESLint + Prettier**.
- Root scripts: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, plus
  `pnpm deploy:dev` (delegates to the service + SPA deploy scripts).
- **Serverless Framework v3** pinned (stable/free; avoids v4 licensing).

---

## 3. Serverless service skeleton (`services/api`)

- Runtime `nodejs20.x`, esbuild bundling, stages `dev`/`prod`, region `eu-west-1`.
- `GET /health` Lambda → `{ status: "ok", stage }`.
- DynamoDB table + GSIs and least-privilege IAM defined in `serverless.yml`.
- `infra/` holds cross-cutting IaC (Cognito user pool + custom triggers, CloudFront/S3)
  wired in during later milestones; M0 only needs the table + health endpoint + SPA hosting.

---

## 4. DynamoDB single-table design

Base table keys: **`PK`**, **`SK`**.

| Entity | PK | SK |
|---|---|---|
| User (Cognito profile mirror) | `USER#<userId>` | `USER#<userId>` |
| Tombola metadata | `TOMBOLA#<tombolaId>` | `TOMBOLA#<tombolaId>` |
| Number (child of tombola) | `TOMBOLA#<tombolaId>` | `NUMBER#<nnn>` (zero-padded) |
| Payment | `PAYMENT#<paymentId>` | `PAYMENT#<paymentId>` |
| DrawAudit | `TOMBOLA#<tombolaId>` | `DRAW#<drawnAt>` |

**GSI1 — lookups & listings** (sparse; multiplexed by key prefix):

| Use | GSI1PK | GSI1SK |
|---|---|---|
| Tombolas by status, ordered by date | `TOMBOLA#STATUS#<status>` | `<openAt>#<tombolaId>` |
| User by phone (login mirror / uniqueness) | `USER#PHONE#<e164>` | `USER` |
| Pending payments (admin queue) | `PAYMENT#STATUS#pending` | `<createdAt>#<paymentId>` |

**GSI2 — "my stuff" by user:** `GSI2PK=USER#<userId>`,
`GSI2SK=TICKET#<tombolaId>#<nnn>` for held numbers, or `PAYMENT#<createdAt>` for payments →
a user's tickets and payment history.

**GSI3 — expiry sweep** (sparse; only RESERVED numbers project into it):
`GSI3PK=RESERVATION_EXPIRY`, `GSI3SK=<reservationExpiresAt>` → the sweep queries `< now` for
overdue holds. Single partition is acceptable at MVP volume; shard the PK if it becomes hot.

**Atomic reserve (supported now, used in M3):** `UpdateItem` on `TOMBOLA#<id> / NUMBER#<nnn>`
with `ConditionExpression: state = available`, setting `state`, `ownerUserId`, `reservedAt`,
`reservationExpiresAt`, and the GSI2/GSI3 attributes.

### Access-pattern coverage (BRD §7)

| BRD access pattern | Served by |
|---|---|
| List tombolas by status, ordered by date | GSI1 (`TOMBOLA#STATUS#…`) |
| List all numbers for a tombola | Base table: query `PK=TOMBOLA#<id>`, `SK begins_with NUMBER#` |
| Atomic reserve of a specific number | Base table conditional `UpdateItem` |
| List a user's reservations/tickets & payments | GSI2 |
| Find reservations past `reservationExpiresAt` | GSI3 |
| List pending payments for admin queue | GSI1 (`PAYMENT#STATUS#pending`) |
| User by phone | GSI1 (`USER#PHONE#…`) |

---

## 5. `packages/shared`

- **Types** for User, Tombola, Number, Payment, DrawAudit (+ enums for statuses/states).
- **Zod schemas** for each entity and for API input validation, imported by both Lambda and
  React.
- **i18n message-key definitions** (typed keys; EN/AR resource files live in the apps).
- **Pure state-machine functions** for the tombola lifecycle
  (DRAFT→UPCOMING→ACTIVE→CLOSED→FINISHED / CANCELLED) and number lifecycle
  (AVAILABLE→RESERVED→CONFIRMED and releases), with unit tests. No I/O — pure transition
  guards reused by handlers and UI.

---

## 6. Frontend scaffold

- `apps/web` (public) and `apps/admin` (role-gated later): Vite + React + TS.
- **Tailwind** configured with logical properties (`ms-/me-`, `start/end`) and mobile-first
  breakpoints; base touch-target sizing ≥44px.
- `dir` attribute on `<html>` driven by the active locale; RTL for Arabic.
- **react-i18next** with EN/AR resource files and a working language switcher that flips
  `dir=rtl` and persists the choice to localStorage (account persistence arrives with M1).
- A placeholder home page in each app proving translated strings render and the RTL flip
  works, on a 360–414px viewport.

---

## 7. Repository structure produced by M0

```
tombola/
├── docs/…
├── apps/
│   ├── web/    (Vite React TS, Tailwind, i18next, placeholder home)
│   └── admin/  (Vite React TS, Tailwind, i18next, placeholder home)
├── services/
│   └── api/    (Serverless v3, GET /health, DynamoDB table + GSIs)
├── packages/
│   └── shared/ (types, Zod, i18n keys, state machines + tests)
├── infra/      (placeholder for Cognito/CloudFront IaC, filled in M1+)
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── .gitignore
```

---

## 8. Exit criteria

1. `pnpm install && pnpm test && pnpm lint && pnpm typecheck` all pass locally.
2. `serverless deploy --stage dev` succeeds; `GET /health` returns `{status:"ok"}` from
   eu-west-1.
3. Both SPAs build and deploy to S3/CloudFront; the language switcher flips EN↔AR with
   correct RTL on a mobile viewport.
4. The single table and all three GSIs exist in the `dev` stage.
5. `packages/shared` state-machine unit tests pass.

---

## 9. Next step

Turn this design into a step-by-step implementation plan via the **writing-plans** skill.
