# Delivery Plan

Roadmap for building Chirp, a Twitter/X clone: scope, phases, the intended commit sequence, and the working protocol for every development session.

- **Architecture and contracts:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Technical decisions and their rationale:** [DECISIONS.md](./DECISIONS.md)

This is a living document. The commit sequence is our best current hypothesis, not a contract: when implementation teaches us something, the plan changes and the change is recorded in the [changelog](#9-plan-changelog).

## Contents

1. [Goal and scope](#1-goal-and-scope)
2. [How we work](#2-how-we-work)
3. [Requirements traceability](#3-requirements-traceability)
4. [Phases and commits](#4-phases-and-commits)
5. [Agent skills timeline](#5-agent-skills-timeline)
6. [Session protocol](#6-session-protocol)
7. [Risks and scope cuts](#7-risks-and-scope-cuts)
8. [Status](#8-status)
9. [Plan changelog](#9-plan-changelog)

---

## 1. Goal and scope

**Goal:** a production-minded, fully tested Twitter/X clone that anyone can run with one command and explore immediately with realistic seed data.

**Required features:** registration, login and logout; protected routes; profiles (unique username, bio, avatar); tweets (create up to 280 characters, delete own); chronological timeline of followed users with infinite scroll; follow/unfollow; like/unlike with visible counts; followers and following lists; user search; mobile-first responsive design; realistic seed; README with runbook and `.env.example`.

**Bonus features:** one-command Docker Compose stack; image attachments on tweets and avatar uploads (S3-compatible storage); reply threads (replies to chirps and to replies, with a thread view); notifications for follows, likes and replies.

**Out of scope** (documented as trade-offs): real-time delivery (SSE/WebSockets), retweets and quote chirps, direct messages, email verification, password reset, OAuth.

**Constraints:** custom authentication (no third-party auth providers); a ~12-hour build budget; full, unsquashed commit history on `main`.

## 2. How we work

- **Vertical slices.** Each phase delivers a feature end to end (schema → API → UI → tests) and ends with working, demoable software. Nothing is "integrated later".
- **Design up front, build incrementally.** The data model and API contracts are designed before coding (ARCHITECTURE.md), but each table, migration, contract and seed addition lands with the feature that needs it (ADR-21).
- **Tests in the same commit as the code they verify.** Coverage thresholds are enforced from the first API commit, so quality cannot be deferred.
- **One planned commit at a time, human-reviewed.** Claude Code implements a single commit's scope, runs `npm run verify`, and stops. The author reviews the diff and makes the commit (ADR-22).
- **Conventional Commits**, imperative, lowercase, in English: `type(scope): description`.
- **The plan adapts.** Deviations (split, merged, reordered or dropped commits; new decisions) are logged in the changelog and, for architectural changes, in DECISIONS.md.

## 3. Requirements traceability

| Requirement | Phase | Verified by |
|---|---|---|
| Registration, login, logout | 1, 2 | API integration tests, web tests, E2E auth flow |
| Route protection | 1, 2 | 401 tests on every protected endpoint, protected-route web tests, E2E |
| Profile: username, bio, avatar placeholder | 1, 5, 7 | users endpoint tests, profile page tests |
| Create tweet (≤ 280), delete own | 3, 4 | tweet endpoint tests (code-point limit, 403 on others), composer tests, E2E |
| Timeline of followed users, chronological, infinite scroll | 3 | pagination tests (order, no gaps/duplicates), timeline web tests |
| Follow / unfollow | 3, 5 | follow endpoint tests, follow button tests, E2E |
| Like / unlike with visible counter | 4 | like endpoint tests (idempotency, counts), optimistic like tests |
| Followers / following lists | 5 | list endpoint tests, list page tests |
| User search | 6 | search endpoint and page tests |
| Responsive, mobile-first (< 640, 640–1024, > 1024) | 2, 9 | app shell built mobile-first; audit at 375/768/1280 |
| Backend coverage ≥ 85% | all | enforced thresholds in CI |
| Seed: ≥ 10 users, tweets, follows, cross-likes | 1, 3, 4, 7, 8 | `npm run db:seed`; E2E uses seeded data |
| README, runbook, `.env.example` | 0, 10 | clean-clone runbook check |
| Bonus: Docker one-command stack | 0, 10 | clean-clone `docker compose up --build` |
| Bonus: image uploads | 7 | presign and attachment tests |
| Bonus: reply threads | 7b | reply and thread endpoint tests (404 parent, ordering, ancestor cap, cascade), thread page and reply composer tests, E2E |
| Bonus: notifications | 8 | notification rule tests |

## 4. Phases and commits

Estimates are focused hours including review. Each commit includes its tests and passes `npm run verify`.

### Phase 0 · Foundation (~1.25 h)

**Outcome:** an empty but production-shaped monorepo: tooling, conventions, local infrastructure and CI all working.

| # | Commit | Scope |
|---|---|---|
| C01 | `docs: add project plan, architecture and technical decisions` | `docs/PLAN.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` |
| C02 | `chore: initialize npm workspaces monorepo with typescript, eslint and prettier` | root `package.json` (workspaces, scripts), `tsconfig.base.json`, ESLint flat config, Prettier, `.editorconfig`, `.gitignore`, `.nvmrc` |
| C03 | `docs: add CLAUDE.md with repository conventions` | patterns (API module, web feature), rules (shared has no server code; no server state in Zustand), commands, definition of done, session protocol summary, skill map |
| C04 | `chore(skills): add fastify and prisma agent skills` | reviewed skills in `.claude/skills/` |
| C05 | `chore(shared): scaffold shared contracts package` | `packages/shared` as a just-in-time internal package (no build), Vitest, `countCharacters` + `TWEET_MAX_LENGTH`, server-import guards |
| C06 | `chore(api): scaffold fastify app with env config, error handling and health check` | `buildApp`, `server.ts` (graceful shutdown), `config/env.ts`, logger with redaction, domain errors + errors plugin, explicit module registry, `GET /api/health`, `npm run verify`, tests |
| C07 | `chore(infra): add docker compose with postgres and s3-compatible storage for local development` | `docker-compose.yml` (`db`, `storage` = RustFS, `storage-init` = aws-cli), `docker/` init scripts, `.env.example`, `services:up`/`services:down` |
| C08 | `ci: add github actions workflow for lint, typecheck and tests` | `verify` on every push/PR with actions pinned by SHA, coverage table in the job summary (PostgreSQL service joins in C09, with the first database tests) |

**Done when:** `npm ci && npm run verify` passes locally and in CI; `npm run services:up` yields healthy services and a configured bucket.

### Phase 1 · Authentication API (~1.25 h)

**Outcome:** users can register, sign in and sign out through the API; protected routes reject anonymous requests; the seed creates demo users.

| # | Commit | Scope |
|---|---|---|
| C09 | `feat(db): add users and sessions schema with test database harness` | Prisma setup, migration `users_and_sessions`, prisma plugin, test setup (migrate `chirp_test`, truncate), `buildTestApp`, user factory, PostgreSQL service + migrations in the CI workflow |
| C10 | `feat(auth): add password hashing and session token utilities` | `lib/password.ts` (argon2id), `lib/tokens.ts` (random token + SHA-256); unit tests |
| C11 | `feat(auth): add register, login, logout and me endpoints` | auth contracts in shared, auth module, session plugin (cookie, lookup, sliding renewal, `requireAuth`), `loginAs` helper; integration tests (201/200/204/401/409, validation) |
| C12 | `feat(auth): add origin check, security headers and rate limiting` | `Origin` verification on state-changing requests, helmet, rate limiting on auth routes; tests |
| C13 | `feat(db): add seed with demo users` | `seed.ts` (reset / `--if-empty` modes, testable CLI) with 12 hand-written personas and the demo account |

**Done when:** a seeded user can sign in with `curl` and call `GET /api/auth/me`; API coverage ≥ 85%.

### Phase 2 · Web foundation and authentication UI (~1.75 h)

**Outcome:** a responsive Chirp shell where users can register, sign in, stay signed in across reloads and sign out.

| # | Commit | Scope |
|---|---|---|
| C14 | `chore(skills): add react best practices and impeccable design skills` | reviewed skills (`vercel-react-best-practices`, `vercel-composition-patterns`, `impeccable`) + `PRODUCT.md` written with `/impeccable init` (users, positioning, voice); the visual system (`DESIGN.md`) is created with the first UI work in C16 |
| C15 | `chore(web): scaffold vite react app with tailwind, router and query` | Vite app, Tailwind 4, React Router 8 (library mode), TanStack Query, Vitest + jsdom + RTL + MSW (strict), `@/` alias, `/api` dev proxy, `npm run dev` (API + web); smoke tests. Zustand and react-hook-form arrive with their first use (C17, C19) |
| C16a | `feat(web): add visual identity and design tokens` | impeccable world round (roll, decision page, author chose **Postmarked**), direction contract (`apps/web/.impeccable/surfaces/`), `light-dark()` tokens for day and night with AA-verified pairs, self-hosted Archivo, `Postmark` signature component, dev-only `/styleguide`, detector + finish review (ship) + `DESIGN.md` |
| C16b | `feat(web): add ui primitives` | `Button`/`ButtonLink` (explicit variants), `Avatar` (picture or initials on avatar tokens), `Field` compound (label/hint/error/counter wiring), `Modal` compound on native `<dialog>`, `Spinner`, `EmptyState`, toasts via Sonner behind `notify`; lucide-react icons; styleguide components section (`?section=`); finish review + DESIGN.md refresh |
| C17 | `feat(web): add responsive app shell and routing` | `AppShell`, `Sidebar`, `BottomNav`, `RightPanel`, compose FAB; route map with placeholder pages, each code-split with route `lazy` (the C15 bundle is 348 KB) |
| C18 | `feat(web): add api client and session handling` | `api-client.ts` (typed errors, global 401 handling), query client, query keys, `useSession`; MSW base handlers; tests |
| C19 | `feat(web): add login and register pages` | forms with `react-hook-form` + shared schemas, server errors mapped to fields; tests (success, validation, invalid credentials, taken email) |
| C20 | `feat(web): add protected routes and logout` | `ProtectedRoute` / `GuestRoute`, return-to-original-route, logout; tests |

**Done when:** the full sign-up → sign-out → sign-in loop works in the browser at all three breakpoints.

### Phase 3 · Tweets and timeline (~1.5 h)

**Outcome:** users compose tweets and scroll a chronological timeline of the people they follow.

| # | Commit | Scope |
|---|---|---|
| C21 | `feat(tweets): add create, get and delete tweet endpoints` | migration `tweets`, tweet contracts, service (280 code points, 403 on others' tweets), serializer; tests |
| C22 | `feat(follows): add follow and unfollow endpoints` | migration `follows` (self-follow `CHECK`), idempotent endpoints, 400 on self-follow; tests |
| C23 | `feat(timeline): add home timeline with cursor pagination` | `lib/cursor.ts`, `GET /timeline`; tests: only followed + self, ordering, tie-breaking, no duplicates across pages, malformed cursor → 400 |
| C24 | `feat(db): seed tweets and follow graph` | persona-matched tweets over 30 days; follow graph |
| C25 | `feat(web): add tweet composer with character counter` | inline composer on home + modal from the FAB; code-point counter; cache insertion; tests |
| C26 | `feat(web): add infinite scroll home timeline` | `TweetCard`, reusable `TweetList`, `HomePage` with empty/error/end states; tests across two pages |

**Done when:** signing in as `demo` shows a populated timeline that loads more on scroll, and a new tweet appears at the top.

### Phase 4 · Likes (~0.75 h)

**Outcome:** tweets show like counts; users like, unlike and delete their own tweets with instant feedback.

| # | Commit | Scope |
|---|---|---|
| C27 | `feat(likes): add like and unlike endpoints with counters` | migration `likes`, idempotent endpoints, `likeCount` / `likedByMe` on every tweet response; tests |
| C28 | `feat(db): seed cross-likes` | each user likes 10–30 tweets from people they follow |
| C29 | `feat(web): add optimistic likes and tweet deletion` | `LikeButton` with rollback; author-only delete with confirmation modal; tests |

**Done when:** like counts update instantly and survive a reload; deleting a tweet removes it from the timeline.

### Phase 5 · Profiles and social graph (~1.5 h)

**Outcome:** profile pages with follow buttons, follower/following lists and profile editing.

| # | Commit | Scope |
|---|---|---|
| C30 | `feat(users): add profile, profile update and user tweets endpoints` | `GET /users/:username`, `PATCH /users/me`, `GET /users/:username/tweets`; tests |
| C31 | `feat(follows): add followers and following lists` | paginated lists with `isFollowing`; tests |
| C32 | `feat(web): add profile page with follow button` | header (avatar, bio, counts, optimistic `FollowButton` or "Edit profile"), tweets via `TweetList`; tests |
| C33 | `feat(web): add followers and following lists` | tabbed pages, `UserRow` with `FollowButton`, infinite scroll; tests |
| C34 | `feat(web): add edit profile modal` | display name and bio with counters; avatar slot ready for Phase 7; tests |

**Done when:** following someone from their profile adds their tweets to the home timeline.

### Phase 6 · Search (~0.5 h)

**Outcome:** users find people by name or username.

| # | Commit | Scope |
|---|---|---|
| C35 | `feat(search): add user search by name or username` | migration `user_search_trgm`, `GET /users/search` (username prefix matches first); tests |
| C36 | `feat(web): add user search page and side panel search` | `/search` with debounce, right-panel search on desktop, `UserRow` results; tests |

**Done when:** searching "ana" from mobile and desktop finds the matching seed users.

### Phase 7 · Media — bonus (~1.25 h)

**Outcome:** images on tweets, uploaded avatars, and illustrated avatars for seed users.

| # | Commit | Scope |
|---|---|---|
| C37 | `feat(api): add storage service with s3 and in-memory drivers` | `StorageService`, `S3Storage` (client with `requestChecksumCalculation: 'WHEN_REQUIRED'`, see ADR-14), `MemoryStorage`, storage plugin, public URL builder; tests |
| C38 | `feat(uploads): add presigned upload endpoint` | `POST /uploads/presign` (type, size, user-prefixed key; presign with `signableHeaders` for `content-type` and `content-length`, see ADR-14); tests |
| C39 | `feat(tweets): support image attachments` | migration `tweet_image_key`, ownership + existence check, `imageUrl` in DTO, best-effort delete; tests |
| C40 | `feat(web): attach images in composer and render them in tweets` | reusable `useImageUpload` (presign → PUT with progress), preview/remove, lazy images in `TweetCard`; tests |
| C41 | `feat(users): support avatar uploads` | migration `user_avatar_key`, `avatarKey` in `PATCH /users/me`, avatar picker in the edit profile modal; tests |
| C42 | `feat(db): seed dicebear avatars` | generation script, committed SVGs, seed uploads them through `StorageService` |

**Done when:** a tweet with an image and a new avatar both render after a reload, locally and against the storage container.

### Phase 7b · Reply threads — bonus (~1.75 h)

**Outcome:** users reply to chirps and to other replies, and read a conversation on its own page: the chirps it answers above, the chirp itself, its replies below.

Added after the plan was approved (see the [changelog](#9-plan-changelog)). Its commits are numbered after C53 so every existing reference stays valid, and they run **after C42 and before C43**, so notifications ship with the `REPLY` type from their first migration. Design: ADR-24.

| # | Commit | Scope |
|---|---|---|
| C54 | `feat(tweets): add replies to tweets` | migration `tweet_replies` (`tweets.parent_id`, self-reference with `ON DELETE CASCADE`, index `(parent_id, created_at, id)`); `POST /tweets/:id/replies` (same body and rules as `POST /tweets`, 404 on a missing parent, a parent deleted concurrently maps to 404); `Tweet` DTO gains `replyCount` (aggregated, ADR-13) and `replyTo: { id, author } \| null` in `tweetRowSelect`; home timeline and profile chirps list top-level chirps only; web fixtures and MSW handlers updated to the new DTO; tests (201/400/401/404, reply to a reply, self-reply, counts, cascade, timeline and profile exclusion) |
| C55 | `feat(tweets): add replies list and thread ancestors endpoints` | `GET /tweets/:id/replies` (oldest first: `lib/cursor.ts` gains an ascending keyset), `GET /tweets/:id/ancestors` (recursive CTE, root first, the 20 nearest ancestors); tests (404, ordering and tie-breaking, no gaps or duplicates across pages, malformed cursor, depth cap, a deleted ancestor removes the branch) |
| C56 | `feat(db): seed reply threads` | hand-written replies matching the personas: conversations two to four levels deep, self-threads, replies on `demo`'s chirps; timed after the chirp they answer |
| C57 | `feat(web): add tweet detail page with thread view` | `/:username/status/:tweetId` (code-split): ancestors joined by a thread line, the focused chirp at full size, replies through `InfiniteList`; "Replying to @user" on reply rows; the postmark links each chirp to its page; 404 and deleted states; impeccable shape + review of the thread view and DESIGN.md update; tests |
| C58 | `feat(web): add reply composer and reply counts` | `ReplyButton` with count on every `TweetCard` (opens the compose modal in reply mode: the store holds only the target id), inline reply composer on the detail page; on success `replyCount` is bumped in every cached `Page<Tweet>` (`tweet-cache.ts`) and the reply is appended to the thread; deleting the focused chirp returns to the previous page; tests (reply from the feed and the thread, counter and limit, 404 parent, failure) |

**Done when:** replying to a seeded chirp from the home timeline raises its reply count, and the reply appears in the chirp's thread after a reload, at all three breakpoints.

### Phase 8 · Notifications — bonus (~1 h)

**Outcome:** users are notified when someone follows them, likes their tweets or replies to them.

| # | Commit | Scope |
|---|---|---|
| C43 | `feat(notifications): create notifications on follow, like and reply` | migration `notifications` (types `FOLLOW`, `LIKE`, `REPLY`); transactional create/delete in follow, like and reply services; never self; idempotent; seed notifications; tests for every ADR-15 rule |
| C44 | `feat(notifications): add list, unread count and mark as read endpoints` | three endpoints; tests |
| C45 | `feat(web): add notifications page and unread badge` | `/notifications` (optional like grouping; a reply notification opens its thread), badge in `Sidebar` / `BottomNav` polling every 30 s, mark read on open; tests |

**Done when:** liking `demo`'s tweet from another account raises `demo`'s badge, and undoing the like removes the notification.

### Phase 9 · End-to-end and quality (~1 h)

**Outcome:** critical flows verified in a real browser; UI audited on mobile, tablet and desktop.

| # | Commit | Scope |
|---|---|---|
| C46 | `chore(skills): add playwright and webapp testing skills` | reviewed skills |
| C47 | `test(e2e): add playwright setup and authentication flow` | config, global setup (reset + seed `chirp_test`), auth flow spec |
| C48 | `test(e2e): add compose tweet, follow and reply flows` | compose → appears on timeline; follow → their tweets appear on home; reply → appears in the thread and the count rises |
| C49 | `ci: run end-to-end tests` | E2E job (PostgreSQL, storage, Chromium) |
| C50 | `fix(web): address responsive and accessibility audit findings` | `impeccable` audit + screenshots at 375 / 768 / 1280; fixes |

**Done when:** the E2E suite is green in CI and the audit findings are resolved or logged as known limitations.

### Phase 10 · Delivery (~1 h)

**Outcome:** anyone can clone, run and evaluate Chirp by following the README.

| # | Commit | Scope |
|---|---|---|
| C51 | `feat(docker): add production images and one-command stack` | multi-stage Dockerfiles (API via tsup; web via nginx with `/api` proxy), entrypoint (migrate + seed when empty, only when opted in with a variable the compose file sets, so a production deploy never creates the demo accounts; ADR-23), `api` and `web` services |
| C52 | `docs: add readme with runbook and technical decisions` | runbook (prerequisites with exact versions, install, seed, dev, tests, env vars, credentials), decision summary linking DECISIONS.md, trade-offs, AI usage |
| C53 | `chore: final cleanup` | runbook verified from a clean clone in both modes; unused dependencies and leftovers removed |

**Done when:** a fresh clone reaches a seeded, working app with only the documented commands.

### Optional (only if time remains)

| Commit | Scope |
|---|---|
| `feat(users): add replies tab on profiles` | `GET /users/:username/replies` and a "Replies" tab next to the profile's chirps |
| `feat(web): add who to follow panel` | right-panel suggestions on desktop |

## 5. Agent skills timeline

Skills are installed at project level (`.claude/skills/`) when the phase that needs them begins, and each `SKILL.md` is read before installation (skills are instructions the agent will follow, and some run commands). `CLAUDE.md` maps which skill applies to which task.

| Commit | Skill | Source | Applies to |
|---|---|---|---|
| C04 | `fastify-best-practices` | `mcollina` (Fastify lead maintainer) | all API work |
| C04 | Prisma skills (`prisma-cli`, `prisma-client-api`) | `prisma/skills` (official) | schema, migrations, queries |
| C14 | `vercel-react-best-practices` | `vercel-labs/agent-skills` | all web work |
| C14 | `vercel-composition-patterns` | `vercel-labs/agent-skills` | component API design |
| C14 | `impeccable` | `pbakaus/impeccable` | visual design, UX review, audits (native engine downloaded on first use, verified by SHA-256; no edit hook, never `live`) |
| C46 | `playwright-best-practices` | `currents-dev/playwright-best-practices-skill` | E2E specs |
| C46 | `webapp-testing` | `anthropics/skills` | agent-driven visual QA (screenshots per breakpoint) |

Reference install: `npx skills add <owner/repo> --skill <name>` (confirm current CLI flags at install time; target: project scope, Claude Code).

## 6. Session protocol

Work happens in sequential local Claude Code sessions. A new session has no memory of previous ones; this protocol and `CLAUDE.md` are what make it pick up exactly where the last one stopped.

### Starting a session

1. Read `CLAUDE.md`, then this plan's [Status](#8-status) and [Changelog](#9-plan-changelog).
2. Run `git log --oneline -15` and match the latest commits against [Phases and commits](#4-phases-and-commits) to find the next commit.
3. Run `git status`. If there are uncommitted changes, they belong to a commit awaiting review: report them and do not start new work.
4. Bring the environment up: `npm run services:up`, `npm ci`, `npm run db:migrate`.
5. Run `npm run verify`. It must be green before any new work.
6. Load the skills relevant to the phase.

### Before implementing a commit

Explain the commit to the author — goal, files, decisions, open questions — without editing files. Implement only after the author approves.

### At every commit boundary

1. `npm run verify` passes.
2. Report to the author:
   - the exact commit message;
   - the changed files (`git status --short`);
   - what deserves review (decisions made, anything uncertain or deviating from the plan);
   - the `verify` summary, including coverage.
3. **Stop.** The author reviews and commits. Continue only when asked.

### At the end of a phase

- The last commit of the phase also updates [Status](#8-status).
- Any deviation from the plan is added to the [Changelog](#9-plan-changelog) in the commit where it happens; architectural changes also amend DECISIONS.md.

### Rules

- Implement only the current commit's scope. If the plan is ambiguous or wrong, stop and raise it rather than improvising.
- Follow the patterns in ARCHITECTURE.md §3; when a new pattern is needed, propose it first.
- Never commit, push, or rewrite history; never edit applied migrations.

### Session kickoff prompt

```text
Continue building Chirp. Read CLAUDE.md and docs/PLAN.md (Status, Changelog, Session protocol) first.
Determine the next planned commit from git log, prepare the environment and confirm `npm run verify` is green.
Then explain that commit and wait for my approval before implementing it; stop at its boundary with the
report described in the session protocol.
```

## 7. Risks and scope cuts

| Risk | Mitigation |
|---|---|
| The runbook fails on an evaluator's machine | one-command Docker mode plus a clean-clone check (C53); non-default Postgres port (5433) |
| Presigned URLs unreachable from the browser under Docker | separate `S3_PUBLIC_ENDPOINT` (ADR-14) |
| Older Docker (20.10) / Compose (v2.0) | verify `depends_on` conditions in C07 and C51; fall back to healthchecks plus entrypoint retries |
| Backend coverage below 85% | thresholds enforced from C06; tests ship with every commit |
| Running over the time budget | cut in the order below |

**Cut order** (first to go → last):
1. Optional commits (profile replies tab, who to follow).
2. Like grouping in notifications.
3. Thread ancestors (C55's `/ancestors`, C57's context above the chirp): the detail page shows the parent only, through `replyTo`.
4. Avatar uploads (C41); seed avatars stay.
5. Notifications UI (C45); the API remains.
6. **Never cut:** required features, tests, runbook.

## 8. Status

| Phase | Commits | Status |
|---|---|---|
| 0 · Foundation | C01–C08 | ✅ Done |
| 1 · Authentication API | C09–C13 | ✅ Done |
| 2 · Web foundation and auth UI | C14–C20 | ✅ Done |
| 3 · Tweets and timeline | C21–C26 | ✅ Done |
| 4 · Likes | C27–C29 | ✅ Done |
| 5 · Profiles and social graph | C30–C34 | ✅ Done |
| 6 · Search | C35–C36 | ✅ Done |
| 7 · Media | C37–C42 | ⏳ |
| 7b · Reply threads | C54–C58 | ⏳ |
| 8 · Notifications | C43–C45 | ⏳ |
| 9 · End-to-end and quality | C46–C50 | ⏳ |
| 10 · Delivery | C51–C53 | ⏳ |

**Pinned versions** (filled in as each tool is added): Node 22.23.5 · npm 10.9.9 · TypeScript 6.0.3 · ESLint 10.15.0 · typescript-eslint 8.73.0 · Prettier 3.10.1 · Zod 4.6.7 · Vitest 5.1.1 · Vite 8.3.8 · PostgreSQL 16.16 · Prisma 7.10.1 · @node-rs/argon2 2.2.2 · @fastify/cookie 11.1.5 · @fastify/helmet 13.2.0 · @fastify/rate-limit 11.3.0 · Fastify 5.12.8 · fastify-type-provider-zod 7.0.0 · AWS SDK for JavaScript v3 (`client-s3`, `s3-request-presigner`) 3.1175.0 · React 19.3.1 · React Router 8.5.2 · TanStack Query 5.108.2 · Tailwind 4.3.5 · Sonner 2.0.8 · Zustand 5.1.0 · lucide-react 1.77.0 · Archivo (Fontsource) 5.3.0 · MSW 3.0.7 · jsdom 31.0.1 · RustFS 1.0.6 · aws-cli 2.42.0 · actions/checkout 7.0.1 · actions/setup-node 7.1.0 · Playwright —

> TypeScript stays on 6.0.x: typescript-eslint 8.73 supports `typescript <6.1`, so TypeScript 7 would break type-aware linting. Revisit when typescript-eslint adds TS 7 support.

## 9. Plan changelog

| Date | Change | Reason |
|---|---|---|
| 2026-11-20 | Initial plan | — |
| 2026-11-20 | Session protocol: the agent explains each commit and waits for approval before implementing | The author reviews the approach before any code is written, not only the resulting diff |
| 2026-11-20 | C05: `@chirp/shared` has no build step (exports point at source) instead of a tsup build | Every consumer already compiles TypeScript; avoids a watch process and stale builds. ADR-02 updated |
| 2026-11-20 | C06: modules registered explicitly instead of `@fastify/autoload` | Autoload scans folders at runtime, which breaks with a bundled build; ADR-03 amended |
| 2026-11-20 | C06: health split into liveness (`/api/health`) and readiness (`/api/health/ready`, C09); logging driven by `LOG_LEVEL`/`LOG_PRETTY` instead of `NODE_ENV` | Adopted from the Fastify skill review (ADR-03) |
| 2026-11-20 | C07: local object storage is RustFS (bucket setup with `amazon/aws-cli`) instead of MinIO; services renamed `storage` / `storage-init` | MinIO no longer publishes pullable images; four alternatives were tested against Chirp's storage flow. ADR-14 amended, including two AWS SDK presigning pitfalls to apply in C37–C38 |
| 2026-11-20 | C08: the CI PostgreSQL service moves to C09; lint fails on any warning (`--max-warnings 0`) | Configuration lands with the first code that exercises it; warnings should not accumulate silently |
| 2026-11-20 | C09: readiness endpoint `GET /api/health/ready`; npm `overrides` pins `effect@3.22.5` | Readiness was split out in C06; the Prisma CLI's transitive `effect` dependency has a high-severity advisory (ADR-04) |
| 2026-11-20 | Fix after C09: `testDatabaseUrl()` takes the whole environment object; its fallback test passes `{}` | CI failed: passing `undefined` triggers the parameter default (`process.env`), so the test only passed locally because `.env` matched the fallback. Local CI simulations now use a URL that differs from the fallback |
| 2026-11-20 | C11: `requireAuth` moved from C12 into C11 (C12 renamed); `/auth/me` returns `SessionUser` instead of `UserProfile`; logout is idempotent and needs no session | `/auth/me` and logout need the session guard; follower/tweet counts do not exist yet and the private email must never appear in a public profile; signing out must work even with an expired session |
| 2026-11-20 | C12: `WEB_ORIGIN` became `WEB_ORIGINS` (list); added `TRUST_PROXY`, `RATE_LIMIT_GLOBAL_MAX`, `RATE_LIMIT_AUTH_MAX`; sign-in rate limit keyed by IP + email in `preHandler` | Dev (5173) and Docker (8080) origins differ; limits are tunable per environment and relaxed in tests; the Fastify skill's per-email example keys on an unparsed body (ADR-09) |
| 2026-11-20 | C13: hand-written seed personas instead of Faker; `db:reset` dropped; seed has reset and `--if-empty` modes | Twelve coherent personas read better than random data and need no dependency; the seed's reset mode already restores demo data, while schema resets stay a deliberate human action; Docker must not wipe data on restart |
| 2026-11-21 | C14: impeccable 4.10 replaced `/teach-impeccable` with `/impeccable init` → `PRODUCT.md` (product truth) and `DESIGN.md` (visual system, created in C16); added `vercel-composition-patterns`; impeccable installed without its edit hook | Upstream changed the workflow; the hook would run a native binary on every UI edit, so audits run explicitly instead; `live` mode can bypass agent permissions |
| 2026-11-21 | C15: Node 22.14 → 22.23.5 (`.nvmrc`, engines `>=22.22.0`); web dependencies are added with their first use (Zustand in C17, react-hook-form in C19) | React Router 8 and jsdom 31 require Node ≥ 22.22 (same LTS line, security fixes). Sequential work removed the reason to pre-install dependencies, so no commit adds an unused one |
| 2026-11-21 | Workflow: each commit explanation names the agent skills that apply and what is adopted from them; web adds a no-barrel-files rule and route-level code splitting (from C17) | C15 was implemented without consulting `vercel-react-best-practices`; a post-hoc review found no violations but surfaced `bundle-dynamic-imports` and `bundle-barrel-imports`, so the check is now visible before approval |
| 2026-11-21 | C16 split into C16a (visual identity and tokens) and C16b (UI primitives); visual world chosen through impeccable's process: the roll assigned "On Air", the author chose "Postmarked" (airmail) on the decision page | The world round, its review and DESIGN.md are a substantial, separately reviewable step; one commit per concern keeps the history readable |
| 2026-11-21 | Impeccable's finish reviewer and documenter run as fresh-context agents (authorized by the author); the reviewer returned `fix` (nested card, postmark accessibility, avatar contrast, day-first postmark), all four were fixed and scored resolved (`ship`) | The skill's own agents ship in Codex format; a fresh general-purpose agent following the skill's reviewer/documenter procedure preserves the unbiased review |
| 2026-11-21 | C16b: toasts use Sonner (unstyled, behind a `notify` wrapper) instead of a Zustand store; Zustand stays in C17. lucide-react moved from C17 to C16b. Compound components use named exports (`Field`, `FieldLabel`…) instead of `Object.assign` | Sonner already solves live regions, focus/hover pause, stacking and swipe; the modal, toasts and errors need icons now; Fast Refresh only preserves state for files that export components alone |
| 2026-11-21 | C16b review round: danger button outlined (night danger read as primary); loading keeps full colour; avatars decorative by default with opt-in label; `aria-describedby` lists only rendered parts; modal closes only on a true backdrop press; `scrollbar-gutter: stable`; new `field-border` token (text-field outlines at ≥3:1, WCAG 1.4.11); toasts fire only after closing a modal | Found by the fresh-context finish reviewer (`fix` → all seven code fixes resolved) and the documenter; DESIGN.md refreshed to match |
| 2026-11-21 | C17: layout components live in `app/layout/` (ARCHITECTURE §2); the header avatar and the Profile nav item wait for the session (C18); Notifications has a route but no nav item until Phase 8; compose buttons open a placeholder "New chirp" modal whose visibility is a Zustand store (the composer fills it in C25); `RESERVED_USERNAMES` added to the shared username schema; `@chirp/shared` declares `"sideEffects": false`; `Button` gains an `icon` size; the sign-in and sign-up placeholders carry no header or chevron until their real screens (C19) | No fake user before sessions exist; no nav link to a bonus page that may be cut; a user named `home` or `search` would have an unreachable profile (ADR-18); importing one helper through the shared barrel pulled all of Zod into the main chunk (397 → 312 KB); overriding size classes from outside lost to the primitive's own padding and position |
| 2026-11-21 | C18: feature modules own their query keys (`features/<x>/keys.ts`) and Zustand stores (`features/<x>/store.ts`) instead of `lib/query-keys.ts` and `src/stores/`; the composer store moves to `features/tweets/store.ts`. Responses are validated with the shared schemas in the client. The header avatar and the Profile nav item arrive with the session | The author's module convention, consistent with the skills (no barrels; the hook is the only place that knows how state is stored) and with TanStack Query's and Zustand's own guidance; ADR-07 amended. The server's JSON is untrusted input (CLAUDE.md: parse unknown input with Zod) |
| 2026-11-21 | Extra commit after C18 (not in the plan): `fix(web): cover the scrollbar gutter behind open modals`. `lockPageScroll` trades the stable gutter for equal padding while a modal is open | Found by the C17 finish reviewer: with classic scrollbars the modal's backdrop left the reserved gutter undimmed. Keeping `scrollbar-gutter: stable` outside modals preserves layout stability between pages |
| 2026-11-21 | C19: new `FormAlert` primitive and `lib/form-errors.ts` (`applyServerError`) for form-level failures; `zod` declared in the web app (peer of `@hookform/resolvers`); sign-in offers "Use the demo account" (fills, does not submit); creating an account lands on `/search` with a welcome toast, signing in on `/home`; password fields have a show toggle; the auth screens got their own impeccable surface brief, without a concept round | A form-level failure (wrong credentials, rate limit, no connection) belongs to no field; declaring a peer avoids relying on hoisting; reviewers sign in with the demo account (PRODUCT.md); a new account's timeline is empty until it follows someone; the author chose a single-column form on the established world |
| 2026-11-21 | C20: guards are components reading the session query; return-to lives in history state (`{ from }`, Zod-validated, in-app paths only) rather than `?next=`; account creation ignores it (still opens `/search`); signing out calls the API, drops the whole query cache and opens `/login` without a toast, and on a network failure shows an error toast and stays signed in; sign-out lives at the rail's foot and, on phones, at the header's trailing edge; the session is prefetched at startup; sign-in/sign-out mutations carry keys the guards watch; `AppRouter` renders `RouterProvider` with `useTransitions={false}` | No open-redirect surface and nothing in the URL; a new account's timeline is empty; one account's cached data must not reach the next; removes the route-code → session request waterfall. React Router 8 commits navigations as transitions (only the first update honours `flushSync`), so the mutation settled before the new page rendered and the guards redirected to the wrong place (found by the tests). Nothing in the app suspends, so transitions brought no benefit |
| 2026-11-21 | C22: `:username` route params use a looser `usernameParamsSchema` (any unknown name, reserved ones included, is 404; only empty or over-length is 400); follow inserts use `ON CONFLICT DO NOTHING` (`createMany({ skipDuplicates })`) and a foreign-key violation from a concurrently deleted user maps to 404; follow notifications wait for Phase 8 | A missing profile is "not found", not invalid input; idempotency without catching P2002; the endpoints table's "notifies" needs the `notifications` table (C43) |
| 2026-11-21 | C23: ADR-11's keyset example combined the cursor `OR` with the filters by spreading, which drops a filter that has its own `OR` (the timeline's); fixed to `AND` in ADR-11 and `lib/cursor.ts`. A `limit` above 50 is a 400, not clamped. `tweetRowSelect` moved to `serializers.ts` next to `TweetRow` | Following the example literally would leak strangers' tweets from page 2 on (covered by a regression test); strict validation like every other input; the timeline and tweets modules share one tweet shape |
| 2026-11-21 | C25: text counter only (no progress ring); the inline composer shows from `sm` up (phones use the FAB); the phone's full-screen composer is deferred and the FAB opens the regular modal; `Modal` focuses an element marked `data-autofocus` on open; the modal composer stays mounted, so a draft survives closing it; test setup dismisses Sonner toasts between tests | The existing counter already states the limit in words and is announced; a ring repeats it and leans on colour. The FAB is one tap away, so the phone timeline starts at the top. A full-screen variant of `Modal` is its own change. The browser focuses the close button first, but this dialog's job is typing. Sonner's store outlives the unmounted `Toaster`, so a toast leaked into the next test |
| 2026-11-21 | C26: `TweetList` takes any infinite query of `Page<Tweet>` plus an `empty` slot and drops a chirp repeated across pages; the next page starts 600px before the end and a failed page waits for "Try again" instead of retrying on scroll; rows use `content-visibility: auto`; the like count is plain text until the `LikeButton` (C29) and `imageUrl` is not rendered until Phase 7; the page heading moved into `PageHeading` (shared with `PagePlaceholder`); the styleguide's sample chirps render through `TweetCard`; tests stub `IntersectionObserver` (`test/intersection-observer.ts`) and the base MSW handlers serve an empty timeline; list behaviour is tested through `HomePage.test.tsx` | Reused by profiles (C32) without flags; retrying on scroll would hammer a failing API; one chirp row implementation, so the styleguide cannot drift from the feed; jsdom has no layout, and every screen that renders home now asks for the timeline |
| 2026-11-22 | C27: `tweetRowSelect` becomes `tweetRowSelect(viewerId)` (like count via `_count`, the viewer's own like via a filtered `likes` relation with `take: 1`), so `GET /tweets/:id` now reads the viewer; like inserts use `ON CONFLICT DO NOTHING` and a tweet deleted concurrently maps to 404, mirroring follows; unliking a missing tweet is 404 (unliking a tweet not liked is 200); authors may like their own chirps; like notifications wait for Phase 8; new shared `likeStateSchema` and `createLike` factory | One select shape for every tweet response keeps `likedByMe` from drifting between endpoints (ADR-13); the same idempotency pattern as C22; a missing tweet is not found whichever verb; the notifications table arrives in C43 |
| 2026-11-22 | C28: cross-likes are picked by a seeded generator (FNV-1a + Mulberry32, no dependency) over each persona's followed authors instead of being listed by hand; each like is timed a few minutes to four hours after the later of the chirp and the liker's join date, clamped to `now`; tweets are inserted with `createManyAndReturn` and matched back by author, time and content; `SeedResult` and the CLI output gain `likes` | ~240 hand-written references would bury the persona data and break whenever a chirp is edited; the seed stays deterministic. RETURNING guarantees no row order |
| 2026-11-22 | C29: likes reconcile by toggle order, not by answer order: each `LikeButton` numbers its toggles and only the newest one may write the server's state or roll back (with an error toast); no `onSettled` refetch, the response carries the count; every cached `Page<Tweet>` list under `tweetKeys.all` is updated (`tweet-cache.ts`), so profiles (C32) get it for free. Deletion is confirmed, not optimistic: the dialog shows a form alert on failure and stays open, a 404 counts as deleted, and the toast fires after the dialog closes. `Button` gains an `icon-sm` (36px) size. `TweetCard` reads the session to show Delete on the viewer's own chirps, so its tests render through `renderRoute` | Quick like/unlike clicks reach the server in order, but a late answer to the older click would otherwise resurrect it (found by a test); refetching every loaded page per like is wasteful. A destructive action deserves a confirmation, and nothing to undo optimistically; a 48px icon button crowded the chirp row |
| 2026-11-22 | Extra commit after C29 (not in the plan): `fix(db): refuse to reset data the seed did not create`. Reset mode refuses when the database holds non-seed accounts unless `SEED_CONFIRM_RESET` names the database; C51's seed-when-empty becomes opt-in | Nothing stopped `npm run db:seed` from wiping production if run with its `DATABASE_URL`, and a production image must not create accounts with a published password. ADR-23 |
| 2026-11-22 | C37 implemented ahead of Phases 4–6, in parallel with another session working on Phase 4 (it touches no migration, schema or tweet DTO). `StorageService` also has `put` (needed by the avatar seed, C42) and `close`; `buildApp(config, { storage })` injects the driver and builds `S3Storage` from the configuration otherwise; S3 variables default to the docker-compose values like the rest of the local configuration; the S3 driver is tested against an in-process HTTP stand-in (CI has no storage service) and was checked by hand against RustFS (signed type/size enforced, no empty-body checksum, anonymous read) | Phase 4 was already in progress elsewhere and Phases 5–8 depend on it; C37 was the only planned commit with no overlap. Tests never need the storage container (ADR-14) |
| 2026-11-22 | C38 implemented right after C37 (same reason). Accepted types and the 5 MB maximum are shared constants (`IMAGE_CONTENT_TYPES`, `IMAGE_MAX_BYTES`) so the composer can check a file before asking; `UPLOAD_MAX_BYTES` can only lower that limit and is enforced by the service on the `size` field. The key is always generated (`users/{userId}/{purpose}/{uuid}.{ext}`, extension from the content type), a key sent by the client is ignored, and no rate limit beyond the global one applies | The browser should reject a 20 MB photo without a round trip; a configured limit above the shared schema's would never be reachable. Presigning is a local signature (no storage request), so it costs no more than any other request |
| 2026-11-22 | C30: profile contracts live in `@chirp/shared`'s new `schemas/profiles.ts` (`userProfileSchema`, `updateProfileBodySchema`, `bioSchema`; `BIO_MAX_LENGTH` = 160 code points) because they reuse `displayNameSchema` from `auth.ts`, which already imports `users.ts`; `PATCH /users/me` accepts only `displayName` and `bio` until avatars (C41) and ignores unknown fields like every body; an empty body returns the profile unchanged; `userProfileRowSelect(viewerId)` / `toUserProfile` in `serializers.ts` compute the counts with `_count` and `isFollowing` from the viewer's own follow, mirroring `tweetRowSelect` | Avoids a circular import; `avatarKey` needs the uploads module; one select shape keeps every profile response consistent |
| 2026-11-22 | C31: `lib/cursor.ts` gains `newestFirstBy(column)` and `keysetAfterBy(cursor, column)` (the cursor's `id` holds that column), and `toPage` takes an optional `position` for rows that are not `{ createdAt, id }`; follow lists page on `(createdAt, followerId)` / `(createdAt, followingId)` as ARCHITECTURE §5.2 states; the row contract is `followListUserSchema` (`UserSummary & { isFollowing }`, the viewer's own follow); the endpoints live in the `follows` module next to follow/unfollow. The `following` list orders on `createdAt` without a dedicated index | One keyset implementation for every list instead of a copy per table; `follows` has no `id`. The PK serves the filter, and per-user follow counts are small (at most hundreds) at this scale |
| 2026-11-22 | C32: the profile's chirps are an infinite query under `tweetKeys.byUser(username)`, so the C29 like and delete cache updates reach them; usernames are lowercased before they become keys or requests; the profile and its chirps load in parallel; `FollowButton` uses the same newest-toggle-wins reconciliation as likes, then invalidates the home timeline and the viewer's own profile; posting a chirp invalidates the author's profile and chirp list, deleting one invalidates cached profiles; the page heading is the display name and the header section is named "Profile"; a 404 shows "This account doesn't exist" with a link to search; `formatMonthYear` joins `lib/format.ts`; `profileFound`/`userTweetsPages` MSW handlers and `profileFixture` for tests. "Edit profile" arrives with its modal (C34) | Following someone must put their chirps on the home timeline (the phase's "Done when"); `/Ana` and `/ana` are one account (ADR-18); no request waterfall; a button that opens nothing would be misleading |
| 2026-11-22 | C33: the infinite list moves to `components/ui/InfiniteList.tsx` (with `use-load-more.ts`), generic over the item, its key and a plural noun for the loading and error copy; `TweetList` and the follow lists are thin wrappers over it, and de-duplication now works for any item; the two lists are tabs made of `NavLink`s (each list keeps its own address, `replace` so switching tabs does not stack history) marked by `aria-current`, a bold label, airmail blue and a 3px bar, not an ARIA tablist; the page heading is the display name (the username until the profile arrives); follow list keys sit under `profileKeys.detail(username)`, so refreshing the viewer's profile after a follow also refreshes their own lists; `useFollowUser` updates the profile and every cached row for that user; the viewer's own row has no follow button; the route-guard test now waits for the real page | One list behaviour instead of two drifting copies (CLAUDE.md: generic UI in `components/ui`); the tabs are navigation between addresses; a follow from a row must agree with the same person's profile |
| 2026-11-22 | C34: `FieldInput` gains the same `maxCharacters` live counter as `FieldTextarea` (one shared `useCharacterCount` and `FieldCounter` inside `Field.tsx`); the modal lives in `features/profile/components/EditProfileModal.tsx`, opened by `EditProfileButton` in the profile header; the form takes the saved profile through react-hook-form's `values`, Save stays disabled until something changed, Cancel resets; on success the profile and session caches take the server's answer at once, and chirps and follow lists (not the fresh profile) are refetched so the new name shows everywhere; the avatar slot shows the initials avatar with a note until uploads (C41) | The display name needs a counter like the bio (DESIGN: counters on both); a no-op save would only send an empty request; the session feeds the header avatar and the composer, chirps embed the author's name |
| 2026-11-22 | Fix after C38: `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` lose their defaults and are required (like `DATABASE_URL`); region, bucket, path style and upload limit keep theirs; tests take placeholder values from `TEST_STORAGE_ENV`; C51's compose must set them for the `api` service | A deploy missing them would have started against `localhost:9000` with the published development credentials instead of failing at startup (CLAUDE.md: no secrets in code). Amends the C37 entry above |
| 2026-11-22 | C35: `GET /users/search` returns `Page<FollowListUser>` (`UserSummary & { isFollowing }`) instead of ARCHITECTURE's `Page<UserSummary>`, so results render as `UserRow` with a follow button; the term is trimmed and a leading `@` dropped (`searchTermSchema`, 1–50 characters after cleanup); ranking is three tiers (exact username, username prefix, any other username or display-name match), newest accounts first within a tier, and pages keep the standard `(createdAt, id)` cursor: the cursor's user tells which tier to resume in (usernames are immutable; a deleted cursor user resumes in the last tier, which never repeats rows); `%`, `_` and `\` are escaped for LIKE because Prisma passes them through as wildcards; the trigram indexes are declared in `schema.prisma` as well as created in SQL (ADR-04 amended) and a schema test guards them; the module is `search` (ARCHITECTURE §2) | A follow button needs to know the current state; one cursor format for every list (CLAUDE.md), with relevance first as the plan asks; `_` is common in usernames, so `a_c` must not match `abc`; an undeclared trigram index is dropped by the next `migrate dev` |
| 2026-11-22 | C36: the address (`/search?q=…`) stays the single source of truth: `SearchForm` is now a controlled field that writes the address 300 ms after typing pauses (at once on Enter), replacing the history entry while on `/search` and pushing one when it opens the results from another page; every copy of the form follows the address (derived during render, not in an effect), so back and forward restore the field and the results; the old remount-on-change (`key={query}`) would have dropped focus mid-typing; results key on the cleaned term, keep the previous results visible while the next term loads (`keepPreviousData`) and render as `UserRow` in the shared `InfiniteList`; `useFollowUser` also updates rows in cached search results; no request is made without a usable term | The plan's debounce, without a second state that could disagree with the address; a follow must agree wherever the person appears |
| 2026-11-22 | New bonus phase 7b · Reply threads (C54–C58), run after C42 and before C43; replies removed from out of scope; C43 adds the `REPLY` notification type, C45 opens a reply's thread, C48 adds a reply flow; the optional tweet detail page becomes C57; a profile "Replies" tab joins the optional commits; new commits are numbered after C53 so existing references stay valid. ADR-24 added, ADR-15 amended | The author asked for replies. Placing the phase before notifications gives `NotificationType` all three values in its first migration instead of an enum change later |
