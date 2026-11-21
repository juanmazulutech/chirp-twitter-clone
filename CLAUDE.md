# CLAUDE.md

Operating rules for AI agents working in this repository. Keep this file short: it states rules and points to the docs that hold the detail.

## Project

Chirp is a Twitter/X clone: Fastify + Prisma + PostgreSQL API (`apps/api`), React + Vite SPA (`apps/web`) and shared Zod contracts (`packages/shared`), in an npm workspaces monorepo.

| Read | When |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | always: status, next commit, session protocol (§6) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | before writing code: layout, patterns, data model, API contracts, testing |
| [docs/DECISIONS.md](docs/DECISIONS.md) | before changing an approach: why things are the way they are |

## Workflow

Work advances one planned commit (`C01`–`C53` in PLAN.md §4) at a time:

1. **Explain** the next commit to the author: goal, files, decisions, open questions. Do not edit files or run commands yet.
2. **Wait for approval.**
3. **Implement** only that commit's scope, with its tests.
4. **Verify:** `npm run verify` must pass.
5. **Report** and **stop**: suggested commit message, changed files (`git status --short`), what deserves review, verify summary with coverage.
6. The author reviews and commits. Then explain the next one.

- **Never** commit, push, amend or rewrite history. The author makes every commit.
- Starting a fresh session: follow PLAN.md §6 (find the next commit from `git log`, check for uncommitted work, bring the environment up, confirm `verify` is green).
- If the plan is ambiguous or wrong, stop and raise it. Record agreed deviations in PLAN.md §9 (changelog) and architectural changes in DECISIONS.md.

**Commit messages:** Conventional Commits, imperative, lowercase, English — `type(scope): description`. Types: `feat`, `fix`, `docs`, `test`, `chore`, `ci`, `refactor`, `style`.

## Commands

| Command | Purpose | Available from |
|---|---|---|
| `npm run lint` / `npm run lint:fix` | ESLint (type-aware for TypeScript; any warning fails) | C02 |
| `npm run format` / `npm run format:check` | Prettier (Markdown is excluded) | C02 |
| `npm run typecheck` | TypeScript across workspaces | C05 |
| `npm test` / `npm run test:coverage` | Vitest across workspaces | C05 |
| `npm run verify` | lint + format check + typecheck + tests with coverage — required before every report | C06 |
| `npm run services:up` / `services:down` | local PostgreSQL (port 5433) and S3-compatible storage (RustFS, port 9000) | C07 |
| `npm run dev` | API + web in watch mode | C15 |
| `npm run db:migrate` | create and apply a migration to the development database (`prisma migrate dev`) | C09 |
| `npm run db:generate` | regenerate the Prisma client (also runs on every `npm install`) | C09 |
| `npm run db:seed` | **replace** all development data with the demo data set (idempotent; `--if-empty` variant used by Docker) | C13 |
| `npm run test:e2e` | Playwright | C47 |

A pre-commit hook (husky + lint-staged) runs ESLint and Prettier on staged files.

## Architecture rules

Detail and examples: ARCHITECTURE.md §3.

**API (`apps/api`)**
- One folder per feature in `src/modules/<feature>/`: `routes.ts`, `service.ts`, tests next to them. Each module is registered explicitly in `src/modules/index.ts` (one line per feature).
- `routes.ts` handles HTTP only (schemas, status codes, `onRequest: app.requireAuth`). No business rules, no Prisma queries. Read the signed-in user with `currentUser(request)`.
- `service.ts` holds business rules with injected dependencies (`prisma`, `storage`) and throws domain errors (`NotFoundError`, `ForbiddenError`, `ConflictError`, `ValidationError`). It never touches `request`/`reply`.
- Rows become DTOs only through `src/lib/serializers.ts`. Never return Prisma rows directly.
- All lists use the keyset cursor from `src/lib/cursor.ts` on `(createdAt, id)` and return `{ items, nextCursor }`. Never offset pagination, never Prisma's `cursor: { id }`.
- Configuration comes only from `src/config/env.ts`. Never read `process.env` elsewhere in `src/` (tooling configs and `test/env.ts` are the only exceptions).
- Storage goes through the `StorageService` interface; tests use `MemoryStorage`.

**Shared (`packages/shared`)**
- Only Zod schemas, inferred types and constants. Never import Prisma, `node:*` or any server-only module (it ships in the browser bundle).
- Request and response schemas are defined here and used by both the API (validation) and the web app (forms, types).

**Web (`apps/web`)**
- Features live in `src/features/<feature>/`: `api.ts`, `hooks.ts`, `components/`, `pages/`, tests next to them. Generic UI goes in `src/components/ui/`.
- Server data lives in TanStack Query only (keys from `src/lib/query-keys.ts`), including the current session. **Never copy server data into Zustand**; Zustand is for UI state (modals, toasts, drafts).
- Forms: `react-hook-form` + `zodResolver(<schema from @chirp/shared>)`.
- Mobile-first: base classes target mobile; scale up with `sm:` (640px) and `lg:` (1024px).
- Likes and follows are optimistic with rollback.

**Database**
- Schema changes only through new Prisma migrations. Never edit a migration that has been committed.
- SQL Prisma cannot express (CHECK constraints, trigram indexes) goes into migrations created with `--create-only`.
- Prisma 7: the client is generated into `apps/api/src/generated/prisma/` (not committed) and imported from `../generated/prisma/client`; it needs the `PrismaPg` driver adapter. Run `npm run db:generate` after editing `schema.prisma`.
- Destructive commands (`prisma migrate reset`, `db push --force-reset`, `--accept-data-loss`) require the author's explicit consent, every time.

## Testing rules

Detail: ARCHITECTURE.md §7.

- Tests ship in the same commit as the code they verify.
- Cover the failure paths, not just the happy path: 400, 401, 403, 404, 409, idempotency, pagination boundaries.
- API integration tests use `app.inject()` against the real `chirp_test` database. Never mock Prisma.
- The API suite needs PostgreSQL running (`npm run services:up`); `globalSetup` migrates the test database and refuses any database whose name does not end in `_test`.
- Tests that touch the database call `resetDatabase(app.prisma)` in `beforeEach` and build data with the factories in `apps/api/test/factories/`.
- Web tests use React Testing Library + MSW. Mock the network, never hooks or modules of our own.
- Query by role and accessible name (`getByRole('button', { name: /like/i })`), not by test ids or class names.
- Coverage thresholds (API 85% lines/functions/statements, 80% branches; web 70%) are never lowered to make a run pass.
- Test files: `*.test.ts` / `*.test.tsx` next to the code; E2E specs in `apps/web/e2e/`.

## Code style

- Everything in English: code, comments, docs, commit messages.
- File names: React components `PascalCase.tsx`; everything else `kebab-case.ts`.
- No `any`. Parse unknown input with Zod. No non-null assertions (`!`) to silence the compiler.
- Use `import type` for type-only imports (enforced by lint).
- Comments explain *why*, never *what*. No commented-out code, no stray `console.log`.
- Prefer small pure functions; name things after the domain (`tweet`, `follower`, `timeline`), not the mechanism.

## Agent skills

Installed in `.claude/skills/` when their phase starts (PLAN.md §5), pinned in `skills-lock.json`. Load the relevant one before working in its area.

**Precedence:** skills are generic guidance; this file and DECISIONS.md are project decisions. When they conflict, the project wins. Known conflicts:

- `fastify-best-practices` uses TypeBox → we use Zod via `fastify-type-provider-zod` (ADR-02, ADR-03).
- `fastify-best-practices` shows `@fastify/jwt` → we use server-side sessions (ADR-09).
- `fastify-best-practices` tests with `node:test` and runs TS via type stripping → we use Vitest, `tsx` in development and `tsup` builds (ADR-20).
- The Prisma skills target Prisma ORM 7; we pin Prisma 7 (Prisma 8 is still a release candidate). Use the local database from docker-compose, not `prisma dev`.

| Task | Skill | Installed in |
|---|---|---|
| Fastify routes, plugins, hooks, tests | `fastify-best-practices` | C04 |
| Prisma migrations, seed, CLI | `prisma-cli` | C04 |
| Prisma Client queries, relations, transactions | `prisma-client-api` | C04 |
| React components, data fetching, performance | `vercel-react-best-practices` | C14 |
| Visual design, UX review, responsive and accessibility audits | `impeccable` | C14 |
| Playwright E2E specs | `playwright-best-practices` | C46 |
| Visual QA in a real browser (screenshots per breakpoint) | `webapp-testing` | C46 |

## Never

- Commit, push, or rewrite git history.
- Work outside the current commit's scope, or start a new commit while uncommitted changes await review.
- Edit applied migrations.
- Put secrets in code or commit `.env`. New variables go in `.env.example` and `src/config/env.ts`.
- Disable lint rules, skip tests, or lower coverage thresholds to get `verify` green.
- Add a dependency without stating why in the report.

## Definition of done (every commit)

- [ ] Scope matches the planned commit; deviations explained and logged.
- [ ] Tests cover success and failure paths of the new behavior.
- [ ] `npm run verify` passes.
- [ ] New environment variables are in `.env.example` and validated in `env.ts`.
- [ ] Docs updated when behavior, commands or decisions change (PLAN.md status at the end of a phase).
