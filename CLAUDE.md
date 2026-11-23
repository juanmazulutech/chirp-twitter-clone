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

Work advances one planned commit (`C01`–`C58` in PLAN.md §4; Phase 7b's C54–C58 run between C42 and C43) at a time:

1. **Explain** the next commit to the author: goal, files, decisions, open questions, and **which agent skills apply** — load them first and state what is adopted from each and what is not (and why). Do not edit files or run commands yet.
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

Use the Node version in `.nvmrc` (`nvm use`); several dependencies require Node ≥ 22.22.

| Command | Purpose | Available from |
|---|---|---|
| `npm run lint` / `npm run lint:fix` | ESLint (type-aware for TypeScript; any warning fails) | C02 |
| `npm run format` / `npm run format:check` | Prettier (Markdown is excluded) | C02 |
| `npm run typecheck` | TypeScript across workspaces | C05 |
| `npm test` / `npm run test:coverage` | Vitest across workspaces | C05 |
| `npm run verify` | lint + format check + typecheck + tests with coverage — required before every report | C06 |
| `npm run services:up` / `services:down` | local PostgreSQL (port 5433) and S3-compatible storage (RustFS, port 9000) | C07 |
| `npm run dev` | API (:3000) + web (:5173) in watch mode | C15 |
| `npm run db:migrate` | create and apply a migration to the development database (`prisma migrate dev`) | C09 |
| `npm run db:generate` | regenerate the Prisma client (also runs on every `npm install`) | C09 |
| `npm run db:seed` | **replace** all development data with the demo data set (idempotent; `--if-empty` variant used by Docker) | C13 |
| `npm run build` | production builds: API bundles (tsup) and the web app | C51 |
| `docker compose up --build` | full stack in production images (API not published; web on :8080, demo data seeded when empty) | C51 |
| `npm run test:e2e` | Playwright on its own ports (API :3100, web :5174) against a freshly seeded `chirp_test`; needs `services:up` and `npx playwright install chromium` once; never at the same time as `npm test` | C47 |

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
- Features are self-contained modules in `src/features/<feature>/`: `api.ts`, `keys.ts` (TanStack Query key factory), `hooks.ts`, `store.ts` (Zustand, only when the module has UI state), `components/`, `pages/`, tests next to them. Modules import each other's files directly (e.g. `@/features/tweets/keys`). Generic UI goes in `src/components/ui/`; `src/lib/` holds only domain-free infrastructure (`api-client`, `query-client`, `format`, `notify`).
- No barrel files (`index.ts` that re-exports) inside `apps/web`: import from the source file. The only barrel is `@chirp/shared`'s entry point, the package's public API.
- Route pages are code-split with React Router's route `lazy`, so each screen loads on demand.
- Server data lives in TanStack Query only (keys from each module's `keys.ts`), including the current session (`useSession` in `features/auth`). **Never copy server data into Zustand**; Zustand is for UI state (modals, drafts).
- Requests go through `apiRequest` (`src/lib/api-client.ts`), which validates every response with its `@chirp/shared` schema and throws `ApiError`. A 401 from any request clears the session globally; never handle it per call.
- Forms: `react-hook-form` + `zodResolver(<schema from @chirp/shared>)`. Map a failed submission with `applyServerError` (`src/lib/form-errors.ts`): field messages on their fields, anything else in one `FormAlert`.
- Mobile-first: base classes target mobile; scale up with `sm:` (640px) and `lg:` (1024px).
- Visual system: read `DESIGN.md` before any UI work. Use only the semantic token classes (`bg-paper`, `bg-sheet`, `text-ink`, `text-ink-muted`, `border-hairline`, `bg-airmail-red`, `text-airmail-blue`, `text-danger`, `bg-avatar-N`); never raw hex values. Red is only for the primary action and liked state; one chevron (`.airmail-edge`) under the header; no decorative shadows; feed rows are full-bleed with hairlines, never cards in cards; no state carried by colour alone.
- Build screens from the primitives in `src/components/ui/` (`Button`, `ButtonLink`, `Avatar`, `Field*`, `FormAlert`, `Modal*`, `Spinner`, `EmptyState`); show toasts only through `notify` (`src/lib/notify.ts`), never Sonner directly, and only after closing any open `Modal` (a native dialog covers the toast region). Icons come from `lucide-react` with `strokeWidth={1.75}`; never emoji or Unicode glyphs as icons.
- Files that export components export only components (Fast Refresh); helpers live in sibling `*.ts` files (e.g. `button-classes.ts`, `avatar-utils.ts`).
- Check visual changes on the dev-only `/styleguide` route (`?section=<id>` renders one section) and with `impeccable detect` before reporting. Headless Chrome cannot render narrower than 500px; use `impeccable shot` for phone-width captures.
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
- `vercel-react-best-practices` includes Next.js / React Server Components rules (`server-*`, hydration) → not applicable to our Vite SPA. Its SWR rule maps to TanStack Query, which we use (ADR-07).
- `impeccable` reads product truth from `PRODUCT.md` and the visual system from `DESIGN.md` (repository root). Use its `critique` and `audit` explicitly; its edit hook is intentionally not installed.
- `playwright-best-practices` uses `getByTestId` freely and shows `waitForLoadState('networkidle')` → we query by role and accessible name (test ids only where no accessible name exists) and wait with web-first assertions; specs run against the real stack and the seeded `chirp_test`, never mocked API responses. Its third-party examples (Mailinator, unpkg web-vitals) are not used.
- `webapp-testing` writes Python Playwright scripts and relies on `networkidle` and fixed timeouts → it is guidance for agent-driven visual QA only (C50). Write any automation in TypeScript with `@playwright/test`, use `impeccable shot` for phone-width captures, and add no Python dependency; its `with_server.py` is replaced by Playwright's `webServer`. Save screenshots to the scratchpad, never the repository.

| Task | Skill | Installed in |
|---|---|---|
| Fastify routes, plugins, hooks, tests | `fastify-best-practices` | C04 |
| Prisma migrations, seed, CLI | `prisma-cli` | C04 |
| Prisma Client queries, relations, transactions | `prisma-client-api` | C04 |
| React components, data fetching, performance | `vercel-react-best-practices` | C14 |
| Component APIs (compound components, avoiding boolean props) | `vercel-composition-patterns` | C14 |
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
- Use `impeccable live`: it can run an agent with permission checks disabled. Signing in to an Impeccable account is not needed and would send project data to an external service.

## Definition of done (every commit)

- [ ] Scope matches the planned commit; deviations explained and logged.
- [ ] Tests cover success and failure paths of the new behavior.
- [ ] `npm run verify` passes.
- [ ] New environment variables are in `.env.example` and validated in `env.ts`.
- [ ] Docs updated when behavior, commands or decisions change (PLAN.md status at the end of a phase).
