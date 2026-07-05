# M0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Tombola pnpm monorepo skeleton — a deployable Serverless v3 API with `GET /health`, a DynamoDB single-table + 3 GSIs, a shared types/Zod/state-machine package, and two React SPAs with working EN/AR + RTL — containing no domain logic yet.

**Architecture:** pnpm workspace with `apps/web`, `apps/admin`, `services/api`, and `packages/shared`. All TypeScript, Node 20. The shared package holds entity types, Zod schemas, i18n keys, and pure lifecycle state machines consumed by both Lambda and React. The API is Serverless Framework v3 (esbuild-bundled) deploying to a `dev` stage in eu-west-1. SPAs are Vite + React + Tailwind (logical properties) + react-i18next, hosted on S3 + CloudFront.

**Tech Stack:** pnpm, TypeScript 5, Node 20, Vitest 2, ESLint + Prettier, Serverless Framework v3 + serverless-esbuild, AWS SDK v3 (DynamoDB), Zod 3, Vite 5, React 18, Tailwind CSS 3.4, i18next 23 / react-i18next 14.

**Reference:** Spec at `docs/superpowers/specs/2026-07-05-m0-foundation-design.md`.

---

## File Structure

```
tombola/
├── package.json                      # root: workspace scripts, devDeps (prettier, eslint, typescript)
├── pnpm-workspace.yaml
├── tsconfig.base.json                # shared compiler options
├── .prettierrc.json
├── .eslintrc.cjs
├── .editorconfig
├── .gitignore                        # (exists)
├── packages/shared/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts                  # barrel export
│       ├── enums.ts                  # TombolaStatus, NumberState, PaymentStatus, Role, Locale
│       ├── types.ts                  # User, Tombola, NumberCell, Payment, DrawAudit
│       ├── schemas.ts                # Zod schemas for the above
│       ├── i18n-keys.ts              # typed message-key catalog
│       ├── tombola-machine.ts        # pure tombola lifecycle transitions
│       ├── tombola-machine.test.ts
│       ├── number-machine.ts         # pure number lifecycle transitions
│       └── number-machine.test.ts
├── services/api/
│   ├── package.json
│   ├── tsconfig.json
│   ├── serverless.yml                # provider, functions, DynamoDB table + 3 GSIs, IAM
│   ├── vitest.config.ts
│   └── src/handlers/
│       ├── health.ts                 # GET /health
│       └── health.test.ts
├── apps/web/                         # public SPA
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.cjs
│   ├── vitest.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── App.test.tsx
│       ├── index.css                 # tailwind directives
│       ├── i18n/
│       │   ├── index.ts              # i18next init
│       │   ├── en.json
│       │   └── ar.json
│       └── components/
│           └── LanguageSwitcher.tsx
├── apps/admin/                       # same shape as apps/web, admin strings
└── infra/
    ├── package.json
    ├── serverless.yml                # S3 buckets + CloudFront for both SPAs
    └── scripts/deploy-spas.sh        # build + sync SPAs to S3, invalidate CloudFront
```

---

## Task 1: Monorepo bootstrap

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `.prettierrc.json`, `.eslintrc.cjs`, `.editorconfig`

- [ ] **Step 1: Create the workspace manifest**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "services/*"
  - "packages/*"
  - "infra"
```

- [ ] **Step 2: Create the root package.json**

Create `package.json`:

```json
{
  "name": "tombola",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20 <21" },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "pnpm -r typecheck",
    "format": "prettier --write .",
    "deploy:dev": "pnpm --filter @tombola/api deploy:dev && pnpm --filter @tombola/infra deploy:dev"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.8.0",
    "@typescript-eslint/parser": "^8.8.0",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.3.3",
    "typescript": "^5.6.2"
  }
}
```

- [ ] **Step 3: Create the base tsconfig**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "resolveJsonModule": true,
    "types": []
  }
}
```

- [ ] **Step 4: Create prettier, eslint, editorconfig**

Create `.prettierrc.json`:

```json
{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

Create `.eslintrc.cjs`:

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  env: { node: true, browser: true, es2022: true },
  ignorePatterns: ['dist', 'node_modules', '.serverless', '*.config.*'],
};
```

Create `.editorconfig`:

```ini
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
insert_final_newline = true
trim_trailing_whitespace = true
```

- [ ] **Step 5: Install and verify the workspace resolves**

Run: `pnpm install`
Expected: completes without error; creates `pnpm-lock.yaml` and root `node_modules`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: bootstrap pnpm monorepo tooling"
```

---

## Task 2: Shared package — enums, types, Zod schemas

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/vitest.config.ts`, `packages/shared/src/{index,enums,types,schemas}.ts`

- [ ] **Step 1: Create the package manifest and tsconfig**

Create `packages/shared/package.json`:

```json
{
  "name": "@tombola/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": { "zod": "^3.23.8" },
  "devDependencies": { "typescript": "^5.6.2", "vitest": "^2.1.1" }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"],
  "exclude": ["**/*.test.ts"]
}
```

Create `packages/shared/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { environment: 'node' } });
```

- [ ] **Step 2: Create the enums**

Create `packages/shared/src/enums.ts`:

```ts
export const TombolaStatus = {
  Draft: 'draft',
  Upcoming: 'upcoming',
  Active: 'active',
  Closed: 'closed',
  Finished: 'finished',
  Cancelled: 'cancelled',
} as const;
export type TombolaStatus = (typeof TombolaStatus)[keyof typeof TombolaStatus];

export const NumberState = {
  Available: 'available',
  Reserved: 'reserved',
  Confirmed: 'confirmed',
} as const;
export type NumberState = (typeof NumberState)[keyof typeof NumberState];

export const PaymentStatus = {
  Pending: 'pending',
  Confirmed: 'confirmed',
  Rejected: 'rejected',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const Role = { User: 'user', Admin: 'admin' } as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Locale = { En: 'en', Ar: 'ar' } as const;
export type Locale = (typeof Locale)[keyof typeof Locale];
```

- [ ] **Step 3: Create the entity types**

Create `packages/shared/src/types.ts`:

```ts
import type { TombolaStatus, NumberState, PaymentStatus, Role, Locale } from './enums';

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface User {
  userId: string;
  fullName: string;
  phoneE164: string;
  locale: Locale;
  role: Role;
  status: 'active' | 'disabled';
  phoneVerified: boolean;
  createdAt: string;
}

export interface Tombola {
  tombolaId: string;
  title: LocalizedText;
  description?: LocalizedText;
  status: TombolaStatus;
  gridSize: number;
  pricePerNumber: number;
  currency: string;
  prizeAmount: number;
  prizeDescription?: LocalizedText;
  whishNumberOverride?: string;
  reservationWindowMinutes: number;
  drawPoolMode: 'confirmed_only' | 'full_grid';
  openAt?: string;
  drawAt?: string;
  winningNumber?: number;
  winnerUserId?: string;
  createdBy: string;
  createdAt: string;
}

export interface NumberCell {
  tombolaId: string;
  number: number;
  labelEn: string;
  labelAr: string;
  state: NumberState;
  ownerUserId?: string;
  reservedAt?: string;
  reservationExpiresAt?: string;
  confirmedAt?: string;
}

export interface Payment {
  paymentId: string;
  tombolaId: string;
  numbers: number[];
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  whishReference?: string;
  proofUrl?: string;
  reviewedByAdminId?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface DrawAudit {
  tombolaId: string;
  drawnAt: string;
  drawnByAdminId: string;
  poolSnapshot: number[];
  rngSource: string;
  winningNumber: number;
  winnerUserId: string;
}
```

- [ ] **Step 4: Create the Zod schemas**

Create `packages/shared/src/schemas.ts`:

```ts
import { z } from 'zod';

export const localeSchema = z.enum(['en', 'ar']);
export const localizedTextSchema = z.object({ en: z.string(), ar: z.string() });

export const tombolaStatusSchema = z.enum([
  'draft',
  'upcoming',
  'active',
  'closed',
  'finished',
  'cancelled',
]);
export const numberStateSchema = z.enum(['available', 'reserved', 'confirmed']);
export const paymentStatusSchema = z.enum(['pending', 'confirmed', 'rejected']);

export const userSchema = z.object({
  userId: z.string(),
  fullName: z.string().min(1),
  phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/),
  locale: localeSchema,
  role: z.enum(['user', 'admin']),
  status: z.enum(['active', 'disabled']),
  phoneVerified: z.boolean(),
  createdAt: z.string().datetime(),
});

export const tombolaSchema = z.object({
  tombolaId: z.string(),
  title: localizedTextSchema,
  description: localizedTextSchema.optional(),
  status: tombolaStatusSchema,
  gridSize: z.number().int().positive(),
  pricePerNumber: z.number().nonnegative(),
  currency: z.string().length(3),
  prizeAmount: z.number().nonnegative(),
  prizeDescription: localizedTextSchema.optional(),
  whishNumberOverride: z.string().optional(),
  reservationWindowMinutes: z.number().int().positive(),
  drawPoolMode: z.enum(['confirmed_only', 'full_grid']),
  openAt: z.string().datetime().optional(),
  drawAt: z.string().datetime().optional(),
  winningNumber: z.number().int().optional(),
  winnerUserId: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
});
```

- [ ] **Step 5: Create the barrel export**

Create `packages/shared/src/index.ts`:

```ts
export * from './enums';
export * from './types';
export * from './schemas';
export * from './i18n-keys';
export * from './tombola-machine';
export * from './number-machine';
```

Note: `i18n-keys.ts`, `tombola-machine.ts`, and `number-machine.ts` are created in Tasks 3–4. If typechecking this task alone, temporarily comment those three lines, then uncomment after Task 4. (The subagent executing sequentially can create all three before running typecheck at Task 4.)

- [ ] **Step 6: Verify typecheck passes for the files present**

Run: `pnpm --filter @tombola/shared exec tsc --noEmit src/enums.ts src/types.ts src/schemas.ts`
Expected: no output (success).

- [ ] **Step 7: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add entity enums, types, and Zod schemas"
```

---

## Task 3: Shared package — lifecycle state machines (TDD)

**Files:**
- Create: `packages/shared/src/tombola-machine.ts`, `packages/shared/src/tombola-machine.test.ts`, `packages/shared/src/number-machine.ts`, `packages/shared/src/number-machine.test.ts`

- [ ] **Step 1: Write the failing tombola-machine test**

Create `packages/shared/src/tombola-machine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canTransitionTombola, tombolaTransitions } from './tombola-machine';
import { TombolaStatus } from './enums';

describe('canTransitionTombola', () => {
  it('allows draft -> upcoming', () => {
    expect(canTransitionTombola(TombolaStatus.Draft, TombolaStatus.Upcoming)).toBe(true);
  });
  it('allows active -> closed and closed -> finished', () => {
    expect(canTransitionTombola(TombolaStatus.Active, TombolaStatus.Closed)).toBe(true);
    expect(canTransitionTombola(TombolaStatus.Closed, TombolaStatus.Finished)).toBe(true);
  });
  it('allows active -> cancelled (any pre-finished state)', () => {
    expect(canTransitionTombola(TombolaStatus.Active, TombolaStatus.Cancelled)).toBe(true);
    expect(canTransitionTombola(TombolaStatus.Upcoming, TombolaStatus.Cancelled)).toBe(true);
  });
  it('rejects finished -> anything', () => {
    expect(canTransitionTombola(TombolaStatus.Finished, TombolaStatus.Active)).toBe(false);
    expect(canTransitionTombola(TombolaStatus.Finished, TombolaStatus.Cancelled)).toBe(false);
  });
  it('rejects skipping draft -> active', () => {
    expect(canTransitionTombola(TombolaStatus.Draft, TombolaStatus.Active)).toBe(false);
  });
  it('exposes the transition map', () => {
    expect(tombolaTransitions[TombolaStatus.Active]).toContain(TombolaStatus.Closed);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @tombola/shared exec vitest run src/tombola-machine.test.ts`
Expected: FAIL — cannot find module `./tombola-machine.js`.

- [ ] **Step 3: Implement the tombola machine**

Create `packages/shared/src/tombola-machine.ts`:

```ts
import { TombolaStatus } from './enums';

export const tombolaTransitions: Record<TombolaStatus, TombolaStatus[]> = {
  [TombolaStatus.Draft]: [TombolaStatus.Upcoming, TombolaStatus.Cancelled],
  [TombolaStatus.Upcoming]: [TombolaStatus.Active, TombolaStatus.Cancelled],
  [TombolaStatus.Active]: [TombolaStatus.Closed, TombolaStatus.Cancelled],
  [TombolaStatus.Closed]: [TombolaStatus.Finished, TombolaStatus.Cancelled],
  [TombolaStatus.Finished]: [],
  [TombolaStatus.Cancelled]: [],
};

export function canTransitionTombola(from: TombolaStatus, to: TombolaStatus): boolean {
  return tombolaTransitions[from].includes(to);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @tombola/shared exec vitest run src/tombola-machine.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the failing number-machine test**

Create `packages/shared/src/number-machine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canTransitionNumber, numberTransitions } from './number-machine';
import { NumberState } from './enums';

describe('canTransitionNumber', () => {
  it('allows available -> reserved', () => {
    expect(canTransitionNumber(NumberState.Available, NumberState.Reserved)).toBe(true);
  });
  it('allows reserved -> confirmed (admin confirm)', () => {
    expect(canTransitionNumber(NumberState.Reserved, NumberState.Confirmed)).toBe(true);
  });
  it('allows reserved -> available (expiry/cancel/release/reject)', () => {
    expect(canTransitionNumber(NumberState.Reserved, NumberState.Available)).toBe(true);
  });
  it('allows confirmed -> available (admin release / refund)', () => {
    expect(canTransitionNumber(NumberState.Confirmed, NumberState.Available)).toBe(true);
  });
  it('rejects available -> confirmed (must reserve first)', () => {
    expect(canTransitionNumber(NumberState.Available, NumberState.Confirmed)).toBe(false);
  });
  it('exposes the transition map', () => {
    expect(numberTransitions[NumberState.Reserved]).toContain(NumberState.Confirmed);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm --filter @tombola/shared exec vitest run src/number-machine.test.ts`
Expected: FAIL — cannot find module `./number-machine.js`.

- [ ] **Step 7: Implement the number machine**

Create `packages/shared/src/number-machine.ts`:

```ts
import { NumberState } from './enums';

export const numberTransitions: Record<NumberState, NumberState[]> = {
  [NumberState.Available]: [NumberState.Reserved],
  [NumberState.Reserved]: [NumberState.Confirmed, NumberState.Available],
  [NumberState.Confirmed]: [NumberState.Available],
};

export function canTransitionNumber(from: NumberState, to: NumberState): boolean {
  return numberTransitions[from].includes(to);
}
```

- [ ] **Step 8: Run the full shared test suite**

Run: `pnpm --filter @tombola/shared test`
Expected: PASS (all tests, 2 files).

- [ ] **Step 9: Commit**

```bash
git add packages/shared/src
git commit -m "feat(shared): add tombola and number lifecycle state machines"
```

---

## Task 4: Shared package — i18n message keys

**Files:**
- Create: `packages/shared/src/i18n-keys.ts`

- [ ] **Step 1: Create the typed message-key catalog**

Create `packages/shared/src/i18n-keys.ts`:

```ts
/**
 * Canonical i18n message keys shared across apps. Each app ships en.json / ar.json
 * resource files whose keys must match these. Kept flat and minimal for M0.
 */
export const messageKeys = [
  'app.title',
  'app.tagline',
  'lang.switchToArabic',
  'lang.switchToEnglish',
] as const;

export type MessageKey = (typeof messageKeys)[number];
```

- [ ] **Step 2: Enable the full barrel and typecheck the whole package**

Ensure `packages/shared/src/index.ts` has all six export lines uncommented (from Task 2 Step 5).

Run: `pnpm --filter @tombola/shared typecheck`
Expected: no output (success).

- [ ] **Step 3: Run the shared test suite once more**

Run: `pnpm --filter @tombola/shared test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/i18n-keys.ts packages/shared/src/index.ts
git commit -m "feat(shared): add typed i18n message-key catalog"
```

---

## Task 5: API service — Serverless skeleton + health handler (TDD)

**Files:**
- Create: `services/api/package.json`, `services/api/tsconfig.json`, `services/api/vitest.config.ts`, `services/api/src/handlers/health.ts`, `services/api/src/handlers/health.test.ts`

- [ ] **Step 1: Create the service manifest and tsconfig**

Create `services/api/package.json`:

```json
{
  "name": "@tombola/api",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "build": "tsc --noEmit",
    "deploy:dev": "serverless deploy --stage dev --region eu-west-1"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.658.0",
    "@aws-sdk/lib-dynamodb": "^3.658.0",
    "@tombola/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.145",
    "@types/node": "^20.16.10",
    "esbuild": "^0.24.0",
    "serverless": "^3.39.0",
    "serverless-esbuild": "^1.54.6",
    "typescript": "^5.6.2",
    "vitest": "^2.1.1"
  }
}
```

Create `services/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["node", "aws-lambda"], "noEmit": true },
  "include": ["src"]
}
```

Create `services/api/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { environment: 'node' } });
```

- [ ] **Step 2: Write the failing health handler test**

Create `services/api/src/handlers/health.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { handler } from './health';

describe('health handler', () => {
  it('returns 200 with status ok and the stage', async () => {
    process.env.STAGE = 'dev';
    const res = await handler();
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.stage).toBe('dev');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @tombola/api exec vitest run src/handlers/health.test.ts`
Expected: FAIL — cannot find module `./health.js`.

- [ ] **Step 4: Implement the health handler**

Create `services/api/src/handlers/health.ts`:

```ts
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export const handler = async (): Promise<APIGatewayProxyStructuredResultV2> => ({
  statusCode: 200,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ status: 'ok', stage: process.env.STAGE ?? 'unknown' }),
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @tombola/api exec vitest run src/handlers/health.test.ts`
Expected: PASS.

- [ ] **Step 6: Install the new service dependencies**

Run: `pnpm install`
Expected: resolves `@tombola/shared` via workspace and installs serverless deps.

- [ ] **Step 7: Commit**

```bash
git add services/api
git commit -m "feat(api): add serverless service skeleton and health handler"
```

---

## Task 6: API service — serverless.yml with DynamoDB single table + 3 GSIs

**Files:**
- Create: `services/api/serverless.yml`

- [ ] **Step 1: Create serverless.yml**

Create `services/api/serverless.yml`:

```yaml
service: tombola-api
frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs20.x
  region: ${opt:region, 'eu-west-1'}
  stage: ${opt:stage, 'dev'}
  memorySize: 256
  timeout: 10
  environment:
    STAGE: ${self:provider.stage}
    TABLE_NAME: ${self:service}-${self:provider.stage}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
            - dynamodb:Query
          Resource:
            - !GetAtt TombolaTable.Arn
            - !Sub '${TombolaTable.Arn}/index/*'

plugins:
  - serverless-esbuild

custom:
  esbuild:
    bundle: true
    minify: false
    target: node20
    format: esm
    platform: node
    outputFileExtension: .mjs

functions:
  health:
    handler: src/handlers/health.handler
    events:
      - httpApi:
          path: /health
          method: get

resources:
  Resources:
    TombolaTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:service}-${self:provider.stage}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - { AttributeName: PK, AttributeType: S }
          - { AttributeName: SK, AttributeType: S }
          - { AttributeName: GSI1PK, AttributeType: S }
          - { AttributeName: GSI1SK, AttributeType: S }
          - { AttributeName: GSI2PK, AttributeType: S }
          - { AttributeName: GSI2SK, AttributeType: S }
          - { AttributeName: GSI3PK, AttributeType: S }
          - { AttributeName: GSI3SK, AttributeType: S }
        KeySchema:
          - { AttributeName: PK, KeyType: HASH }
          - { AttributeName: SK, KeyType: RANGE }
        GlobalSecondaryIndexes:
          - IndexName: GSI1
            KeySchema:
              - { AttributeName: GSI1PK, KeyType: HASH }
              - { AttributeName: GSI1SK, KeyType: RANGE }
            Projection: { ProjectionType: ALL }
          - IndexName: GSI2
            KeySchema:
              - { AttributeName: GSI2PK, KeyType: HASH }
              - { AttributeName: GSI2SK, KeyType: RANGE }
            Projection: { ProjectionType: ALL }
          - IndexName: GSI3
            KeySchema:
              - { AttributeName: GSI3PK, KeyType: HASH }
              - { AttributeName: GSI3SK, KeyType: RANGE }
            Projection: { ProjectionType: ALL }
  Outputs:
    ApiBaseUrl:
      Value: !GetAtt HttpApi.ApiEndpoint
```

- [ ] **Step 2: Validate the serverless config parses**

Run: `pnpm --filter @tombola/api exec serverless print --stage dev --region eu-west-1`
Expected: prints the resolved config with `TABLE_NAME: tombola-api-dev` and the three GSIs — no schema errors.

- [ ] **Step 3: Deploy to the dev stage**

Run: `pnpm --filter @tombola/api deploy:dev`
Expected: CloudFormation stack `tombola-api-dev` creates successfully; output includes an `httpApi` endpoint URL. (Requires AWS credentials configured for eu-west-1.)

- [ ] **Step 4: Smoke-test the deployed endpoint**

Run (substitute the endpoint from Step 3 output): `curl -s "$API_BASE_URL/health"`
Expected: `{"status":"ok","stage":"dev"}`

- [ ] **Step 5: Commit**

```bash
git add services/api/serverless.yml
git commit -m "feat(api): add DynamoDB single-table + 3 GSIs and deploy config"
```

---

## Task 7: Public SPA (apps/web) — Vite + React + Tailwind scaffold

**Files:**
- Create: `apps/web/package.json`, `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/tsconfig.json`, `apps/web/tailwind.config.ts`, `apps/web/postcss.config.cjs`, `apps/web/src/{main.tsx,App.tsx,index.css}`

- [ ] **Step 1: Create the app manifest**

Create `apps/web/package.json`:

```json
{
  "name": "@tombola/web",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@tombola/shared": "workspace:*",
    "i18next": "^23.15.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-i18next": "^14.1.3"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.9",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Create the Vite/TS/Tailwind config**

Create `apps/web/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.ts'] },
});
```

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
    "noEmit": true
  },
  "include": ["src"]
}
```

Create `apps/web/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [],
} satisfies Config;
```

Create `apps/web/postcss.config.cjs`:

```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 3: Create the HTML entry and CSS**

Create `apps/web/index.html`:

```html
<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tombola</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `apps/web/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Create a placeholder App and entry point**

Create `apps/web/src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="min-h-screen p-4">
      <h1 className="text-2xl font-bold">Tombola</h1>
    </main>
  );
}
```

Create `apps/web/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: Install and verify the build**

Run: `pnpm install && pnpm --filter @tombola/web build`
Expected: `tsc --noEmit` passes and Vite produces `apps/web/dist` with no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold Vite + React + Tailwind public SPA"
```

---

## Task 8: Public SPA — i18n (EN/AR) + RTL language switcher (TDD)

**Files:**
- Create: `apps/web/src/test-setup.ts`, `apps/web/src/i18n/{index.ts,en.json,ar.json}`, `apps/web/src/components/LanguageSwitcher.tsx`, `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Create the test setup file**

Create `apps/web/src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: Create the i18n resources**

Create `apps/web/src/i18n/en.json`:

```json
{
  "app": { "title": "Tombola", "tagline": "Reserve your number" },
  "lang": { "switchToArabic": "العربية", "switchToEnglish": "English" }
}
```

Create `apps/web/src/i18n/ar.json`:

```json
{
  "app": { "title": "تومبولا", "tagline": "احجز رقمك" },
  "lang": { "switchToArabic": "العربية", "switchToEnglish": "English" }
}
```

- [ ] **Step 3: Create the i18n init module**

Create `apps/web/src/i18n/index.ts`:

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ar from './ar.json';

const STORAGE_KEY = 'tombola.locale';

export function currentLocale(): 'en' | 'ar' {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'ar' ? 'ar' : 'en';
}

export function applyDir(locale: 'en' | 'ar') {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

export function setLocale(locale: 'en' | 'ar') {
  localStorage.setItem(STORAGE_KEY, locale);
  applyDir(locale);
  void i18n.changeLanguage(locale);
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: currentLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

applyDir(currentLocale());

export default i18n;
```

- [ ] **Step 4: Write the failing language-switcher test**

Create `apps/web/src/App.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App language switching', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dir = 'ltr';
  });

  it('renders the English title by default with dir=ltr', () => {
    render(<App />);
    expect(screen.getByRole('heading')).toHaveTextContent('Tombola');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('switches to Arabic and flips dir=rtl', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'العربية' }));
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getByRole('heading')).toHaveTextContent('تومبولا');
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `pnpm --filter @tombola/web exec vitest run src/App.test.tsx`
Expected: FAIL — App has no button / does not use i18n yet.

- [ ] **Step 6: Create the LanguageSwitcher component**

Create `apps/web/src/components/LanguageSwitcher.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { setLocale } from '../i18n/index';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const next = i18n.language === 'ar' ? 'en' : 'ar';
  const label = next === 'ar' ? 'العربية' : 'English';
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className="min-h-touch min-w-touch rounded border px-3 py-2"
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 7: Wire i18n into App and main**

Replace `apps/web/src/App.tsx` with:

```tsx
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './components/LanguageSwitcher';

export default function App() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('app.title')}</h1>
        <LanguageSwitcher />
      </div>
      <p className="mt-2 text-gray-600">{t('app.tagline')}</p>
    </main>
  );
}
```

Edit `apps/web/src/main.tsx` to import the i18n init — add this import line above `import App`:

```tsx
import './i18n/index';
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm --filter @tombola/web exec vitest run src/App.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Verify the production build still compiles**

Run: `pnpm --filter @tombola/web build`
Expected: typecheck + Vite build succeed.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add EN/AR i18n with RTL-flipping language switcher"
```

---

## Task 9: Admin SPA (apps/admin) — scaffold mirroring web

**Files:**
- Create: the same file set as `apps/web` under `apps/admin`, with admin-specific strings.

- [ ] **Step 1: Copy the web app structure to admin**

Run:

```bash
rsync -a --exclude node_modules --exclude dist apps/web/ apps/admin/
```

- [ ] **Step 2: Rename the package**

Edit `apps/admin/package.json` — change the `"name"` field from `@tombola/web` to `@tombola/admin`. Leave everything else identical.

- [ ] **Step 3: Set admin-specific strings and title**

Replace `apps/admin/src/i18n/en.json`:

```json
{
  "app": { "title": "Tombola Admin", "tagline": "Operator console" },
  "lang": { "switchToArabic": "العربية", "switchToEnglish": "English" }
}
```

Replace `apps/admin/src/i18n/ar.json`:

```json
{
  "app": { "title": "إدارة تومبولا", "tagline": "لوحة المشغّل" },
  "lang": { "switchToArabic": "العربية", "switchToEnglish": "English" }
}
```

Edit `apps/admin/index.html` — change `<title>Tombola</title>` to `<title>Tombola Admin</title>`.

- [ ] **Step 4: Update the admin App test expectation**

Edit `apps/admin/src/App.test.tsx` — change the two heading assertions to the admin titles:
- English default: `toHaveTextContent('Tombola Admin')`
- Arabic after switch: `toHaveTextContent('إدارة تومبولا')`

- [ ] **Step 5: Install, test, and build**

Run: `pnpm install && pnpm --filter @tombola/admin test && pnpm --filter @tombola/admin build`
Expected: tests PASS (2) and the build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/admin
git commit -m "feat(admin): scaffold role-gated admin SPA with EN/AR + RTL"
```

---

## Task 10: Infra — S3 + CloudFront hosting for both SPAs

**Files:**
- Create: `infra/package.json`, `infra/serverless.yml`, `infra/scripts/deploy-spas.sh`

- [ ] **Step 1: Create the infra package manifest**

Create `infra/package.json`:

```json
{
  "name": "@tombola/infra",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "typecheck": "true",
    "test": "true",
    "build": "true",
    "deploy:infra": "serverless deploy --stage dev --region eu-west-1",
    "deploy:dev": "serverless deploy --stage dev --region eu-west-1 && bash scripts/deploy-spas.sh dev"
  },
  "devDependencies": { "serverless": "^3.39.0" }
}
```

- [ ] **Step 2: Create the hosting stack**

Create `infra/serverless.yml`:

```yaml
service: tombola-hosting
frameworkVersion: '3'

provider:
  name: aws
  region: ${opt:region, 'eu-west-1'}
  stage: ${opt:stage, 'dev'}

resources:
  Resources:
    WebBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: tombola-web-${self:provider.stage}
    AdminBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: tombola-admin-${self:provider.stage}
    WebOAC:
      Type: AWS::CloudFront::OriginAccessControl
      Properties:
        OriginAccessControlConfig:
          Name: tombola-web-oac-${self:provider.stage}
          OriginAccessControlOriginType: s3
          SigningBehavior: always
          SigningProtocol: sigv4
    WebDistribution:
      Type: AWS::CloudFront::Distribution
      Properties:
        DistributionConfig:
          Enabled: true
          DefaultRootObject: index.html
          Origins:
            - Id: web-s3
              DomainName: !GetAtt WebBucket.RegionalDomainName
              OriginAccessControlId: !GetAtt WebOAC.Id
              S3OriginConfig: { OriginAccessIdentity: '' }
          DefaultCacheBehavior:
            TargetOriginId: web-s3
            ViewerProtocolPolicy: redirect-to-https
            CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
          CustomErrorResponses:
            - ErrorCode: 403
              ResponseCode: 200
              ResponsePagePath: /index.html
            - ErrorCode: 404
              ResponseCode: 200
              ResponsePagePath: /index.html
    WebBucketPolicy:
      Type: AWS::S3::BucketPolicy
      Properties:
        Bucket: !Ref WebBucket
        PolicyDocument:
          Statement:
            - Effect: Allow
              Principal: { Service: cloudfront.amazonaws.com }
              Action: s3:GetObject
              Resource: !Sub '${WebBucket.Arn}/*'
              Condition:
                StringEquals:
                  AWS:SourceArn: !Sub 'arn:aws:cloudfront::${AWS::AccountId}:distribution/${WebDistribution}'
  Outputs:
    WebBucketName: { Value: !Ref WebBucket }
    AdminBucketName: { Value: !Ref AdminBucket }
    WebDistributionId: { Value: !Ref WebDistribution }
    WebDistributionDomain: { Value: !GetAtt WebDistribution.DomainName }
```

Note: This provisions the public web distribution end-to-end. The admin bucket is created here but its CloudFront distribution + policy are added in M1 when the admin app first needs a hosted URL (YAGNI for M0 — admin is verified via local build in Task 9). If you prefer symmetry now, duplicate the `WebOAC`/`WebDistribution`/`WebBucketPolicy` blocks for admin; not required to pass M0 exit criteria.

- [ ] **Step 3: Create the SPA deploy script**

Create `infra/scripts/deploy-spas.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
STAGE="${1:-dev}"

pnpm --filter @tombola/web build
BUCKET=$(aws cloudformation describe-stacks --stack-name tombola-hosting-${STAGE} \
  --query "Stacks[0].Outputs[?OutputKey=='WebBucketName'].OutputValue" --output text --region eu-west-1)
DIST=$(aws cloudformation describe-stacks --stack-name tombola-hosting-${STAGE} \
  --query "Stacks[0].Outputs[?OutputKey=='WebDistributionId'].OutputValue" --output text --region eu-west-1)

aws s3 sync apps/web/dist "s3://${BUCKET}" --delete --region eu-west-1
aws cloudfront create-invalidation --distribution-id "${DIST}" --paths '/*' --region eu-west-1
echo "Deployed apps/web to s3://${BUCKET} (distribution ${DIST})"
```

Make it executable:

Run: `chmod +x infra/scripts/deploy-spas.sh`

- [ ] **Step 4: Install and validate the infra config parses**

Run: `pnpm install && pnpm --filter @tombola/infra exec serverless print --stage dev --region eu-west-1`
Expected: prints resolved config with no schema errors.

- [ ] **Step 5: Deploy hosting and publish the web SPA**

Run: `pnpm --filter @tombola/infra run deploy:dev`
Expected: `tombola-hosting-dev` stack creates; the script builds `apps/web`, syncs to S3, and creates a CloudFront invalidation. Note the `WebDistributionDomain` output.

- [ ] **Step 6: Smoke-test the hosted SPA**

Run (substitute the domain from Step 5): `curl -sI "https://$WEB_DISTRIBUTION_DOMAIN" | head -1`
Expected: `HTTP/2 200`. Opening the URL in a mobile-width browser shows the Tombola page with a working EN↔AR / RTL switch. (CloudFront can take a few minutes to finish deploying on first create.)

- [ ] **Step 7: Commit**

```bash
git add infra
git commit -m "feat(infra): add S3 + CloudFront hosting and SPA deploy script"
```

---

## Task 11: Root wiring + full exit-criteria verification

**Files:**
- Modify: `package.json` (verify scripts already fan out correctly)

- [ ] **Step 1: Run the full local check suite from the root**

Run: `pnpm install && pnpm test && pnpm lint && pnpm typecheck`
Expected: all green — shared + api + web + admin tests pass; ESLint reports no errors; every package typechecks.

- [ ] **Step 2: Verify the full build**

Run: `pnpm build`
Expected: `@tombola/shared` compiles; `@tombola/web` and `@tombola/admin` produce `dist/`; api/infra `build` scripts are no-ops that succeed.

- [ ] **Step 3: Confirm the deployed API health endpoint (exit criterion 2)**

Run (using the API endpoint from Task 6): `curl -s "$API_BASE_URL/health"`
Expected: `{"status":"ok","stage":"dev"}`

- [ ] **Step 4: Confirm the DynamoDB table + 3 GSIs exist (exit criterion 4)**

Run: `aws dynamodb describe-table --table-name tombola-api-dev --region eu-west-1 --query "Table.GlobalSecondaryIndexes[].IndexName"`
Expected: `["GSI1","GSI2","GSI3"]`

- [ ] **Step 5: Confirm the hosted SPA RTL switch (exit criterion 3)**

Open the `WebDistributionDomain` URL from Task 10 in a browser at a 375px viewport; click the language button.
Expected: title switches Tombola ↔ تومبولا and the page direction flips ltr ↔ rtl.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: M0 foundation complete — verified deploy, tests, and RTL"
```

---

## Definition of Done (maps to spec §8 exit criteria)

1. ✅ `pnpm install && pnpm test && pnpm lint && pnpm typecheck` pass locally (Task 11 Step 1).
2. ✅ `serverless deploy --stage dev` succeeds; `GET /health` returns `{status:"ok"}` from eu-west-1 (Task 6, Task 11 Step 3).
3. ✅ Both SPAs build; web SPA deployed to S3/CloudFront; language switch flips EN↔AR + RTL (Task 8, Task 9, Task 10, Task 11 Step 5).
4. ✅ Single table + 3 GSIs exist in dev (Task 6, Task 11 Step 4).
5. ✅ `packages/shared` state-machine tests pass (Task 3).
```
