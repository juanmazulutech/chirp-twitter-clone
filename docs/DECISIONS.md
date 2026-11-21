# Technical Decisions

Architecture Decision Records for Chirp. Each entry states the **decision**, the **context** that motivated it, the **alternatives** we rejected, its **consequences**, and **when to revisit it** — the condition under which a future team should change course.

Decisions are appended or amended as the project evolves; superseded decisions are marked, not deleted.

| # | Decision | Status |
|---|---|---|
| [01](#adr-01--monorepo-with-npm-workspaces) | Monorepo with npm workspaces | Accepted |
| [02](#adr-02--shared-contracts-as-an-internal-package) | Shared contracts as an internal package | Accepted |
| [03](#adr-03--backend-fastify--typescript) | Backend: Fastify + TypeScript | Accepted |
| [04](#adr-04--orm-prisma) | ORM: Prisma | Accepted |
| [05](#adr-05--database-postgresql) | Database: PostgreSQL | Accepted |
| [06](#adr-06--frontend-react-spa-with-vite) | Frontend: React SPA with Vite | Accepted |
| [07](#adr-07--state-tanstack-query-for-server-state-zustand-for-ui-state) | State: TanStack Query + Zustand | Accepted |
| [08](#adr-08--styling-tailwind-mobile-first) | Styling: Tailwind, mobile-first | Accepted |
| [09](#adr-09--authentication-server-side-sessions-in-an-httponly-cookie) | Authentication: server-side sessions | Accepted |
| [10](#adr-10--identifiers-uuidv7) | Identifiers: UUIDv7 | Accepted |
| [11](#adr-11--keyset-pagination-on-createdat-id) | Keyset pagination on `(createdAt, id)` | Accepted |
| [12](#adr-12--timeline-fan-out-on-read) | Timeline: fan-out on read | Accepted |
| [13](#adr-13--like-counts-are-aggregated-not-denormalized) | Like counts aggregated, not denormalized | Accepted |
| [14](#adr-14--media-s3-compatible-storage-with-presigned-uploads) | Media: S3-compatible storage, presigned uploads | Accepted |
| [15](#adr-15--notifications-transactional-creation-polling-delivery) | Notifications: transactional creation, polling | Accepted |
| [16](#adr-16--seed-avatars-generated-with-dicebear) | Seed avatars generated with DiceBear | Accepted |
| [17](#adr-17--single-origin-in-every-environment) | Single origin in every environment | Accepted |
| [18](#adr-18--lowercase-usernames-and-emails) | Lowercase usernames and emails | Accepted |
| [19](#adr-19--integration-tests-against-a-real-database) | Integration tests against a real database | Accepted |
| [20](#adr-20--automated-quality-gates) | Automated quality gates | Accepted |
| [21](#adr-21--evolutionary-schema-one-migration-per-feature) | Evolutionary schema: one migration per feature | Accepted |
| [22](#adr-22--ai-assisted-development-workflow) | AI-assisted development workflow | Accepted |

---

## ADR-01 · Monorepo with npm workspaces

- **Decision:** a single repository with `apps/api`, `apps/web` and `packages/shared`, managed with **npm workspaces** (no Turborepo/Nx).
- **Context:** the frontend and backend share request/response contracts. In one repo a single change updates both sides and the type checker catches mismatches. npm ships with Node, so the runbook needs no extra tooling.
- **Alternatives:** two repositories (loses cross-checked types, complicates setup); pnpm (faster, but one more prerequisite); Turborepo (build caching we do not need at this size).
- **Consequences:** one lockfile and one `npm ci` for the whole system.
- **Revisit when:** builds exceed ~1 minute or more apps are added → add Turborepo on top of npm workspaces (no migration needed).

## ADR-02 · Shared contracts as an internal package

- **Decision:** `@chirp/shared` contains **only** Zod schemas, inferred types and constants. It is an *internal, just-in-time* package: it has no build step and its `exports` point at the TypeScript source. Each consumer compiles it with its own toolchain — Vite for the web app, `tsx` and Vitest for the API in development, and tsup bundles it into the API's `dist` for production. It is never published; Docker images are built from the monorepo root.
- **Context:** one source of truth for validation — the API validates requests with the same schemas the web forms use.
- **Rule:** `shared` must not import Prisma, `node:*` or any server-only code, so server code can never leak into the client bundle. Enforced twice: ESLint `no-restricted-imports`, and a `tsconfig` with no Node or DOM types (`types: []`), so `process` or `Buffer` fail to compile.
- **Why no build step:** no watch process to run and no stale `dist` — a schema change is visible to the API and web app immediately. A build is only needed once the package is published.
- **Alternatives:** duplicated types (drift, integration bugs); OpenAPI + code generation (sturdier across repositories, more moving parts).
- **Revisit when:** frontend and backend move to separate repositories → generate an OpenAPI spec from the Zod schemas (`@fastify/swagger`) and type the client with `openapi-typescript`, or publish `@chirp/shared` to a private registry with semver.

## ADR-03 · Backend: Fastify + TypeScript

- **Decision:** Fastify with `fastify-type-provider-zod`. Feature modules under `src/modules/<feature>/` (`routes.ts`, `service.ts`, tests), each registered explicitly in `src/modules/index.ts` under the `/api` prefix.
- **Context:** Node + TypeScript is the team's stack. Fastify provides `app.inject()` (integration tests without opening a port), encapsulated plugins, schema-driven validation/serialization and strong performance.
- **Alternatives:** Express (no schema typing, no native inject, more boilerplate); NestJS (heavier ceremony and DI than this scope needs); Next.js route handlers (blurs the backend boundary we want to test and measure independently).
- **Why explicit registration (not `@fastify/autoload`):** autoload discovers modules by scanning folders at runtime, which breaks once tsup bundles the API into a single file and depends on how each runtime (tsx, Vitest) loads `.ts` files. An explicit list is type-checked, works identically in development, tests and the production bundle, and costs one line per feature. *(Amended in C06; autoload was the initial choice.)*
- **Skill review:** the Fastify skill's guidance was adopted for graceful shutdown (`close-with-grace`), liveness vs readiness health checks, log redaction, plugin metadata and request-id propagation; its TypeBox, `@fastify/error`/`@fastify/sensible`, JWT and `node:test` recommendations were not, because they conflict with ADR-02, ADR-09 and ADR-20 or would put HTTP decisions in services.
- **Revisit when:** background work appears (emails, media processing) → a separate `apps/worker` process, not more work inside request handlers.

## ADR-04 · ORM: Prisma

- **Decision:** Prisma for the typed client, migrations and seeding.
- **Context:** the team knows Prisma well; under a fixed time budget familiarity beats marginal gains. It covers everything required: composite cursor filters, `_count` aggregates and interactive transactions.
- **Alternatives:** Drizzle (more transparent typed SQL, no query engine, but a learning curve); Kysely; raw SQL.
- **Consequences:** what Prisma cannot express (the self-follow `CHECK`, trigram indexes) is written as SQL inside migrations created with `--create-only`.
- **Prisma 7 specifics (C09):** pinned to 7.10.1 (Prisma 8 is still a release candidate). The datasource URL lives in `prisma.config.ts`; the `prisma-client` generator writes the client to `src/generated/prisma/`, which is git-ignored and regenerated by a `postinstall` script, so generated code never pollutes diffs or drifts from the schema; the client uses the `@prisma/adapter-pg` driver adapter.
- **Dependency advisory:** the Prisma CLI pulls `effect@3.20.0`, affected by a ReDoS advisory (GHSA-7589-6fvf-x4pw, patched in 3.22.1). It is development tooling only, but an npm `overrides` entry pins `effect@3.22.5` (same major) so `npm audit` stays clean. Remove the override once Prisma ships a patched dependency.
- **Revisit when:** a query cannot be expressed efficiently → use typed raw SQL (`$queryRaw` / TypedSQL) in that one repository function rather than switching ORMs.

## ADR-05 · Database: PostgreSQL

- **Decision:** PostgreSQL 16, run in Docker and exposed on host port **5433** to avoid clashing with a locally installed Postgres on 5432.
- **Context:** relational integrity (composite keys, cascades, `CHECK` constraints), ordered composite indexes, `ILIKE` and `pg_trgm` for search.

## ADR-06 · Frontend: React SPA with Vite

- **Decision:** a single-page app with React, Vite and React Router (data router, library mode).
- **Context:** the product is fully behind authentication, so server rendering brings no SEO benefit. Vite gives instant startup and shares configuration with Vitest.
- **Alternatives:** Next.js (SSR/RSC are unnecessary here and would overlap the Fastify backend).
- **Revisit when:** public, indexable pages are needed (shareable profiles/tweets with link previews) → SSR or prerendering for those routes.

## ADR-07 · State: TanStack Query for server state, Zustand for UI state

- **Decision:** everything that comes from the server lives in **TanStack Query**, including the current session (`useQuery(['auth', 'me'])`). **Zustand** holds client-only UI state: composer modal visibility, toasts, the composer draft.
- **Rule:** never copy server data into Zustand — two sources of truth drift apart.
- **Context:** TanStack Query provides caching, invalidation, retries, `useInfiniteQuery` for infinite scroll and optimistic mutations with rollback.
- **Revisit when:** complex shared client state appears → still Zustand; no Redux.

## ADR-08 · Styling: Tailwind, mobile-first

- **Decision:** Tailwind CSS. Base classes target mobile; `sm:` and `lg:` scale up. The layout follows the familiar X/Twitter structure with Chirp's own identity (name, logo, accent color).
- **Breakpoints:** `< 640px` mobile, `640–1024px` tablet, `> 1024px` desktop — matching Tailwind's `sm` (640) and `lg` (1024).
- **Context:** utility classes make mobile-first the default rather than a discipline; design tokens are CSS variables, which keeps dark mode and theming cheap.

## ADR-09 · Authentication: server-side sessions in an httpOnly cookie

- **Decision:**
  - Passwords hashed with **argon2id** (`@node-rs/argon2`, prebuilt binaries, no native compilation).
  - On login the server generates a 32-byte random token and stores **only its SHA-256 hash** in `sessions`, with a 30-day sliding expiry (renewed once past half its lifetime).
  - The raw token is sent as cookie `chirp_session`: `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`.
  - Each request: read cookie → hash → indexed lookup → `request.user`.
  - Logout deletes the row and clears the cookie: **revocation is immediate**. Logout is idempotent (always `204`), so a client with an already-expired session can still sign out cleanly.
  - Signing in or registering while already signed in revokes the previous session instead of leaving it orphaned.
  - Sessions are resolved in a global `onRequest` hook (only when the cookie is present); routes guard with a route-level `onRequest: app.requireAuth`, which rejects anonymous requests before the body is parsed (Fastify skill guidance). Unknown or expired tokens clear the cookie; expired rows are deleted when encountered. A periodic cleanup job for abandoned expired sessions is out of scope (documented trade-off).
  - CSRF: `SameSite=Lax` + `Origin` check on state-changing methods + JSON-only bodies.
  - Rate limiting on `/auth/login` and `/auth/register`; generic "invalid credentials" errors on login.
  - Login takes the same time whether or not the email exists: an unknown email still runs one argon2 verification against a precomputed dummy hash, so response timing cannot be used to enumerate accounts.
  - argon2id parameters are OWASP's minimum (m=19 MiB, t=2, p=1), set explicitly; they are encoded in each hash, so they can be raised later without invalidating existing hashes.
- **Context:** there is a single backend. Sessions give real revocation, keep the token unreadable by JavaScript (immune to theft via XSS), and a database leak exposes no usable tokens.
- **Alternatives:**
  - *Stateless JWT:* cannot be revoked before expiry without a denylist, which reintroduces server state; logout does not truly log out.
  - *Short-lived access JWT + rotating refresh token stored in the DB:* sound, but more code and edge cases (rotation, reuse detection) while still depending on the database.
  - *JWT in `localStorage`:* readable by any injected script.
- **Consequences:** one indexed query per authenticated request (sub-millisecond). Registration reveals whether an email/username is taken — accepted for UX, mitigated by rate limiting.
- **Revisit when:** multiple services must verify identity without reaching a central database, or third-party/mobile clients consume the API → issue short-lived JWTs derived from the session (token exchange), keeping the session as the source of truth. Under heavy load → cache sessions in Redis.

## ADR-10 · Identifiers: UUIDv7

- **Decision:** every primary key is a UUID (`@default(uuid(7))`, native `uuid` column). Join tables (`follows`, `likes`) use composite primary keys.
- **Context:** UUIDs are not enumerable (no walking `/tweets/1..N`) and are safe in URLs. Version 7 is time-ordered, giving better B-tree locality than v4.
- **Caveat:** a UUIDv7 reflects **insertion** time, not `createdAt` (the seed inserts back-dated tweets), so the id alone is never used as a cursor — see ADR-11.

## ADR-11 · Keyset pagination on `(createdAt, id)`

- **Decision:** all lists use keyset pagination ordered by `createdAt DESC, id DESC`. The cursor is opaque: base64url of `"<ISO createdAt>|<id>"`. We fetch `limit + 1` rows to know whether a next page exists and return `{ items, nextCursor }`.

  ```ts
  where: {
    ...filters,
    ...(cursor && {
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ],
    }),
  },
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  take: limit + 1,
  ```

- **Context:** offset pagination degrades with table size and duplicates or skips rows when new tweets arrive while scrolling. The `id` only breaks ties between identical timestamps, so it just needs to be comparable — UUIDs are.
- **Why not Prisma's native `cursor: { id }`:** it requires the cursor row to still exist; deleting that tweet mid-scroll breaks pagination. The explicit cursor depends on no row.
- **Precision:** Prisma stores `timestamp(3)` (milliseconds), the same precision as a JS `Date`, so cursors round-trip exactly.
- **Limits:** default page size 20, maximum 50.

## ADR-12 · Timeline: fan-out on read

- **Decision:** the home timeline is computed at read time — tweets whose author is followed by the viewer, plus the viewer's own — served by the index `(author_id, created_at DESC, id DESC)`.

  ```ts
  where: { OR: [{ authorId: me }, { author: { followers: { some: { followerId: me } } } }] }
  ```

- **Context:** simple and always consistent (follows and unfollows apply instantly), with no background jobs or extra storage. Comfortable up to thousands of users.
- **Alternative — fan-out on write (Twitter's model):** on publish, push the tweet id into every follower's precomputed timeline. O(1) reads, but O(followers) writes, the celebrity problem (requires a hybrid), backfill on follow and cleanup on unfollow.
- **Revisit when:** timeline p95 exceeds ~200 ms or users follow more than ~5k accounts → hybrid: fan-out on write into Redis for regular accounts, merge at read time for high-follower accounts.

## ADR-13 · Like counts are aggregated, not denormalized

- **Decision:** `likeCount` comes from `_count.likes` in the same query; `likedByMe` from a relation filtered by the viewer.
- **Context:** always correct, no drift. With an index on `likes(tweet_id)` and 20-item pages it is cheap.
- **Alternative:** a `like_count` column updated transactionally (cheaper reads, risk of drift, row contention on viral tweets).
- **Revisit when:** the aggregate shows up in profiling → denormalized counter plus a periodic reconciliation job.

## ADR-14 · Media: S3-compatible storage with presigned uploads

- **Decision:**
  1. The client requests `POST /api/uploads/presign` with `{ purpose: 'tweet' | 'avatar', contentType, size }`.
  2. The API validates type (`image/jpeg|png|webp|gif`) and size (≤ 5 MB), builds the key `users/{userId}/{purpose}/{uuid}.{ext}` and returns `{ uploadUrl, key }` — a URL signed with fixed `Content-Type`/`Content-Length`, valid for 5 minutes.
  3. The browser uploads directly to the bucket with `PUT`.
  4. The client creates the tweet (`imageKey`) or updates the profile (`avatarKey`).
  5. The API verifies the key belongs to the user (prefix `users/{userId}/`) and that the object exists (`HeadObject`).
- **Local and Docker:** **RustFS** (S3-compatible, Apache-2.0) in docker-compose; a one-shot `storage-init` container (official `amazon/aws-cli` image) creates the bucket, a policy allowing anonymous `GetObject` only, and CORS for the web origins. The same AWS SDK (`@aws-sdk/client-s3`, `s3-request-presigner`) targets RustFS or AWS through configuration only.
- **Why RustFS (amended in C07):** MinIO was the initial choice, but it stopped publishing community images in October 2025 and the project was archived; its images are no longer pullable. RustFS, versitygw, SeaweedFS and Garage were evaluated with a script reproducing Chirp's exact flow (bucket policy, CORS preflight, presigned PUT with signed type/size, anonymous read, refused anonymous write/list). RustFS, versitygw and SeaweedFS passed all checks; Garage lacks bucket policies. RustFS was chosen as the closest drop-in for MinIO (same ports, env-based credentials, web console); versitygw is the lightweight fallback. LocalStack was excluded because it now requires an account token. Any of them is development-only infrastructure: production uses S3.
- **SDK pitfalls found during the evaluation (must be applied in the S3 driver):**
  - `getSignedUrl` signs only `host` by default. Pass `signableHeaders: new Set(['content-type', 'content-length'])`, otherwise a presigned URL accepts any content type and size.
  - Recent SDK versions add a CRC32 checksum of an *empty* body to presigned URLs (`x-amz-checksum-crc32=AAAAAA==`), which checksum-validating servers (and S3) reject with `BadDigest`. Create the client with `requestChecksumCalculation: 'WHEN_REQUIRED'`.
- **Two endpoints:** `S3_ENDPOINT` is used by the API (inside Docker: `http://storage:9000`); `S3_PUBLIC_ENDPOINT` is what the browser sees (`http://localhost:9000`). Signed and public URLs are built with the public one.
- **Abstraction:** a `StorageService` interface with `S3Storage` and `MemoryStorage` drivers. Tests never need the storage container.
- **SVG:** rejected for user uploads (script injection if opened directly). Seed avatars are SVGs we generate ourselves and are only rendered through `<img>`.
- **Alternatives:** multipart upload through the API (simpler to test end-to-end, but the API carries every byte); local disk (does not scale horizontally, not production-like).
- **Trade-offs:** orphaned objects when a user uploads but never posts, or when a tweet is deleted (best-effort delete) → in production, a bucket lifecycle rule or a cleanup job.
- **Revisit when:** thumbnails or resizing are needed → asynchronous processing (worker or serverless function) or an image CDN.

## ADR-15 · Notifications: transactional creation, polling delivery

- **Decision:**
  - Types: `FOLLOW` (actor → followed user) and `LIKE` (actor → tweet author, with `tweetId`).
  - Created **in the same transaction** as the triggering action — consistent without a queue.
  - Users are never notified about their own actions (liking your own tweet).
  - Undoing the action (unlike / unfollow) **deletes** its notification.
  - Actions are idempotent: repeating a like is a no-op and creates no duplicate.
  - Deleting a tweet cascades to its notifications.
  - The unread badge polls every 30 s; opening the notifications page marks all as read.
  - Optional UI grouping of likes on the same tweet ("Ana and 3 others liked your chirp"), computed client-side.
- **Context:** the feature is intentionally underspecified; these rules prevent spam, duplicates and dangling notifications.
- **Revisit when:** immediacy is required → Server-Sent Events backed by Postgres `LISTEN/NOTIFY` or Redis pub/sub; at high volume → asynchronous generation through a queue.

## ADR-16 · Seed avatars generated with DiceBear

- **Decision:** seed users get illustrated avatars generated with **DiceBear** using a **CC0-licensed** style (verify the license of the chosen style when implementing). A reproducible script generates them and the SVGs are committed under `apps/api/prisma/seed-assets/avatars/`. The seed uploads them through `StorageService`, the same path a user-uploaded avatar takes.
- **Fallback:** when `avatarKey` is null the UI renders initials on a color derived from the user id.
- **Alternatives:** stock photos (heavier, per-image licensing, real faces); serving from the web app's `public/` folder (a second image path that exists only for demo data).

## ADR-17 · Single origin in every environment

- **Decision:** the browser always talks to one origin. In development, Vite proxies `/api` to the API; in Docker, nginx serves the SPA and proxies `/api`.
- **Context:** no CORS configuration, no cross-site cookies; `SameSite=Lax` works without exceptions.

## ADR-18 · Lowercase usernames and emails

- **Decision:** `username` (`^[a-z0-9_]{3,15}$`) and `email` are stored lowercase, so a plain unique index enforces case-insensitive uniqueness. `displayName` keeps casing and emoji (1–50 characters).
- **Alternatives:** `citext` or a shadow `username_lower` column — more complexity for a cosmetic benefit.

## ADR-19 · Integration tests against a real database

- **Decision:** API integration tests run against a real `chirp_test` database (same container, separate database). It is migrated once in `globalSetup` (`prisma migrate deploy`, the same command production uses) and every application table is truncated before each test (table names are read from the catalog, so new tables are covered automatically); test files run serially. A guard refuses any `TEST_DATABASE_URL` whose database name does not end in `_test`, so a misconfiguration can never wipe the development database.
- **Context:** ORM mocks prove that the mock was called, not that the query works. Constraints, cascades, idempotency and pagination are only verified against the real engine.
- **Revisit when:** the suite exceeds ~60 s → one database or schema per Vitest worker.

## ADR-20 · Automated quality gates

- **Decision:** TypeScript `strict`; ESLint (typescript-eslint, react-hooks, import order); Prettier; coverage thresholds enforced in `vitest.config` (API ≥ 85% lines/functions/statements and ≥ 80% branches; web ≥ 70%); GitHub Actions on every push.
- **`npm run verify`** runs lint (zero warnings allowed), format check, type check and tests with coverage.
- **CI hardening:** GitHub Actions are pinned to full commit SHAs (tags can be moved; SHAs cannot), the workflow token is read-only, and the runner image is pinned (`ubuntu-24.04`) rather than `latest`. It must pass before every commit.

## ADR-21 · Evolutionary schema: one migration per feature

- **Decision:** the full data model is designed up front (see [ARCHITECTURE.md](./ARCHITECTURE.md#4-data-model)), but tables are introduced **by the feature that needs them**, each with its own migration (users/sessions → tweets → follows → likes → search indexes → media columns → notifications). The seed grows with each feature.
- **Context:** designing the model early avoids rework; shipping it incrementally keeps every commit a working, tested vertical slice and leaves a migration history that mirrors how the product was built.

## ADR-22 · AI-assisted development workflow

- **Decision:** development is driven with Claude Code under explicit human direction:
  - **Plan first:** the roadmap ([PLAN.md](./PLAN.md)), the architecture and these decisions were written and reviewed before any code.
  - **Conventions as context:** `CLAUDE.md` encodes the module and feature patterns, the rules above and the definition of done, so every session follows the same structure.
  - **Curated agent skills**, versioned in `.claude/skills/` and reviewed before installation: Fastify (by its lead maintainer), Prisma (official), React performance (Vercel), UI/UX design (impeccable), Playwright, and web app testing (Anthropic).
  - **Human review at every commit boundary:** the agent implements one planned commit, runs `npm run verify`, and stops; the author reviews the diff and commits it.
  - **Living plan:** deviations are recorded in the plan's changelog rather than silently absorbed.
- **Context:** the challenge evaluates how AI tools are directed. Consistent patterns, small reviewed commits and tests in every commit are the evidence.
