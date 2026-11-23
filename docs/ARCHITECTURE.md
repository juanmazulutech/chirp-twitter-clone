# Architecture

How Chirp is structured and the contracts every part of it follows. The reasoning behind each choice lives in [DECISIONS.md](./DECISIONS.md); the delivery roadmap lives in [PLAN.md](./PLAN.md).

## Contents

1. [System overview](#1-system-overview)
2. [Repository layout](#2-repository-layout)
3. [Code patterns](#3-code-patterns)
4. [Data model](#4-data-model)
5. [API contracts](#5-api-contracts)
6. [Frontend](#6-frontend)
7. [Testing strategy](#7-testing-strategy)
8. [Environments and configuration](#8-environments-and-configuration)
9. [Seed data](#9-seed-data)

---

## 1. System overview

```
                 ┌──────────────────────────── single origin ────────────────────────────┐
Browser ───────▶ │  Web (React SPA)            /api/* ───▶  API (Fastify)  ───▶ PostgreSQL │
   │             │  dev: Vite :5173                         :3000                  :5433  │
   │             │  docker: nginx :8080                       │                           │
   │             └────────────────────────────────────────────┼───────────────────────────┘
   │                                                          │ presign / HeadObject
   └──────── PUT (presigned) / GET images ────────────▶  S3 (RustFS) :9000
```

- The browser only ever calls its own origin for the API (ADR-17); images are uploaded to and served from the bucket directly (ADR-14).
- Authentication is a server-side session referenced by an `httpOnly` cookie (ADR-09).

## 2. Repository layout

```
chirp/
├── .claude/skills/                 versioned agent skills
├── .github/workflows/ci.yml
├── apps/
│   ├── api/
│   │   ├── prisma.config.ts        Prisma 7 config: schema, migrations, datasource URL
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   ├── seed.ts
│   │   │   ├── seed-data/          personas and tweet texts
│   │   │   ├── seed-assets/avatars/  DiceBear SVGs (committed)
│   │   │   └── scripts/generate-avatars.ts
│   │   ├── src/
│   │   │   ├── app.ts              buildApp(options): testable factory (injects config, storage)
│   │   │   ├── server.ts           process entry point (listen)
│   │   │   ├── config/env.ts       environment parsed with Zod; fails fast
│   │   │   ├── plugins/            prisma · session/auth · storage · errors · security
│   │   │   ├── lib/                cursor · password · tokens · serializers · errors · storage (S3 + memory drivers)
│   │   │   ├── generated/prisma/   Prisma client (generated on install, not committed)
│   │   │   └── modules/
│   │   │       ├── auth/           routes.ts · service.ts · *.test.ts
│   │   │       ├── users/
│   │   │       ├── follows/
│   │   │       ├── tweets/
│   │   │       ├── timeline/
│   │   │       ├── likes/
│   │   │       ├── search/
│   │   │       ├── uploads/
│   │   │       └── notifications/
│   │   ├── test/                   global-setup (migrations) · env (_test guard) · database (reset) · app · factories/
│   │   ├── tsup.config.ts          production bundles: dist/server.js · prisma/dist/seed.js
│   │   ├── Dockerfile
│   │   └── docker-entrypoint.sh    migrate deploy → seed if empty (only with SEED_DEMO_DATA=true) → start
│   └── web/
│       ├── .impeccable/surfaces/   direction contract for the app surfaces (impeccable)
│       ├── src/
│       │   ├── styles.css          design tokens: light-dark() day/night pairs → Tailwind theme
│       │   ├── app/                routes.tsx · providers.tsx · StyleguidePage (dev only) · layout/ (AppShell, Sidebar, BottomNav, RightPanel)
│       │   ├── features/
│       │   │   ├── auth/           api.ts · keys.ts · hooks.ts · session.ts · pages · components · *.test.tsx
│       │   │   ├── tweets/         store.ts (composer) · Composer, TweetCard, TweetList, HomePage…
│       │   │   ├── profile/        ProfilePage, FollowButton, FollowList, EditProfileModal…
│       │   │   ├── appearance/     theme choice (system, light, dark): store.ts · AppearanceModal (no server data)
│       │   │   ├── search/
│       │   │   ├── uploads/        useImageUpload
│       │   │   └── notifications/
│       │   ├── components/ui/      Button, Avatar, Input, Textarea, Modal, Spinner, Toast, EmptyState
│       │   ├── lib/                domain-free infrastructure: api-client.ts · query-client.ts · format.ts · notify.ts
│       │   └── test/               msw/ (handlers, server) · render.tsx · fixtures.ts
│       ├── e2e/                    Playwright specs and global setup
│       ├── nginx/                  default.conf.template (SPA + /api proxy) · security-headers.inc.template (CSP)
│       └── Dockerfile
├── packages/shared/src/
│   ├── schemas/                    auth · users · tweets · pagination · uploads · notifications · errors
│   ├── constants.ts                TWEET_MAX_LENGTH, USERNAME_PATTERN, PAGE_SIZE…
│   └── index.ts
├── docker/
│   ├── postgres/init.sql           creates chirp_test
│   └── storage/init.sh             creates bucket, public-read policy and CORS (aws-cli)
├── docs/                           PLAN.md · ARCHITECTURE.md · DECISIONS.md
├── CLAUDE.md
├── PRODUCT.md                      product truth for design work (impeccable)
├── DESIGN.md                       visual system "Postmarked": tokens, type, components
├── .impeccable/design.json         machine-readable sidecar of DESIGN.md
├── README.md
├── .dockerignore
├── .env.example
├── .nvmrc
├── docker-compose.yml
└── package.json                    workspaces + root scripts
```

## 3. Code patterns

### 3.1 API module

```ts
// src/modules/tweets/routes.ts
export default async function tweetsRoutes(app: FastifyInstance) {
  const tweets = createTweetsService({ prisma: app.prisma, storage: app.storage });

  app.withTypeProvider<ZodTypeProvider>().post(
    '/tweets',
    {
      onRequest: app.requireAuth, // rejects anonymous requests before the body is parsed
      schema: { body: createTweetBodySchema, response: { 201: tweetSchema } },
    },
    async (request, reply) => reply.code(201).send(await tweets.create(currentUser(request).id, request.body)),
  );
}
```

| Layer | Responsibility | Must not |
|---|---|---|
| `routes.ts` | HTTP: schemas, status codes, auth guard, calling the service | contain business rules or Prisma queries |
| `service.ts` | business rules with injected dependencies (`prisma`, `storage`); throws domain errors (`NotFoundError`, `ForbiddenError`, `ConflictError`, `ValidationError`) | know about HTTP |
| `lib/serializers.ts` | Prisma rows → DTOs (`imageKey` → `imageUrl`, `_count` → `likeCount`) | query the database |
| `plugins/errors.ts` | domain errors and Zod errors → HTTP error format | — |

Tests sit next to the module (`*.test.ts`) and exercise routes through `app.inject()` against the test database.

### 3.2 Web feature

| File | Responsibility |
|---|---|
| `features/<x>/api.ts` | request functions built on `apiRequest`, each response validated with its `@chirp/shared` schema |
| `features/<x>/keys.ts` | the module's query key factory (e.g. `tweetKeys.timeline()`); other modules import it to invalidate |
| `features/<x>/hooks.ts` | `useQuery` / `useInfiniteQuery` / `useMutation` with the module's keys |
| `features/<x>/store.ts` | Zustand store for the module's UI state, only when it has some |
| `features/<x>/components/*` | presentational components |
| `features/<x>/pages/*` | composition plus loading, empty and error states |
| `*.test.tsx` | React Testing Library + MSW (network mocked at the fetch level, never hooks) |

Each feature is a module: everything it owns lives in its folder, and modules import each other's files directly, never through a barrel. `lib/` holds only infrastructure with no domain knowledge.

Forms use `react-hook-form` with `zodResolver(<shared schema>)`.

### 3.3 Error format

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": { "fieldErrors": { "content": ["Too long"] }, "formErrors": [] } } }
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | schema validation fails, malformed cursor, self-follow |
| 401 | `UNAUTHENTICATED` | missing/expired session, invalid credentials |
| 403 | `FORBIDDEN` | deleting another user's tweet, foreign upload key, invalid `Origin` |
| 404 | `NOT_FOUND` | unknown user or tweet |
| 409 | `CONFLICT` | email or username already taken |
| 429 | `RATE_LIMITED` | rate limit exceeded |
| 500 | `INTERNAL_ERROR` | unhandled error (no internals leaked) |

## 4. Data model

The complete target model. Tables are introduced by the feature that needs them (ADR-21); the migration sequence is listed after the schema.

```prisma
enum NotificationType {
  FOLLOW
  LIKE
  REPLY
}

model User {
  id           String   @id @default(uuid(7)) @db.Uuid
  email        String   @unique
  username     String   @unique @db.VarChar(15)
  displayName  String   @map("display_name") @db.VarChar(50)
  bio          String   @default("") @db.VarChar(160)
  avatarKey    String?  @map("avatar_key")
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  sessions           Session[]
  tweets             Tweet[]
  following          Follow[]       @relation("FollowFollower")
  followers          Follow[]       @relation("FollowFollowing")
  likes              Like[]
  notifications      Notification[] @relation("NotificationRecipient")
  actedNotifications Notification[] @relation("NotificationActor")

  @@map("users")
}

model Session {
  id        String   @id @default(uuid(7)) @db.Uuid
  tokenHash String   @unique @map("token_hash")
  userId    String   @map("user_id") @db.Uuid
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

model Tweet {
  id        String   @id @default(uuid(7)) @db.Uuid
  authorId  String   @map("author_id") @db.Uuid
  content   String   @db.VarChar(280) // varchar length counts characters (code points) in Postgres
  imageKey  String?  @map("image_key")
  parentId  String?  @map("parent_id") @db.Uuid // the chirp this one replies to; null for a top-level chirp
  createdAt DateTime @default(now()) @map("created_at")

  author        User           @relation(fields: [authorId], references: [id], onDelete: Cascade)
  parent        Tweet?         @relation("TweetReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies       Tweet[]        @relation("TweetReplies")
  likes         Like[]
  notifications Notification[]

  @@index([authorId, createdAt(sort: Desc), id(sort: Desc)])
  @@index([parentId, createdAt, id])
  @@map("tweets")
}

model Follow {
  followerId  String   @map("follower_id") @db.Uuid
  followingId String   @map("following_id") @db.Uuid
  createdAt   DateTime @default(now()) @map("created_at")

  follower  User @relation("FollowFollower", fields: [followerId], references: [id], onDelete: Cascade)
  following User @relation("FollowFollowing", fields: [followingId], references: [id], onDelete: Cascade)

  @@id([followerId, followingId])
  @@index([followingId, createdAt(sort: Desc)])
  @@map("follows")
  // migration SQL adds: CHECK (follower_id <> following_id)
}

model Like {
  userId    String   @map("user_id") @db.Uuid
  tweetId   String   @map("tweet_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  tweet Tweet @relation(fields: [tweetId], references: [id], onDelete: Cascade)

  @@id([userId, tweetId])
  @@index([tweetId])
  @@map("likes")
}

model Notification {
  id          String           @id @default(uuid(7)) @db.Uuid
  type        NotificationType
  recipientId String           @map("recipient_id") @db.Uuid
  actorId     String           @map("actor_id") @db.Uuid
  tweetId     String?          @map("tweet_id") @db.Uuid
  readAt      DateTime?        @map("read_at")
  createdAt   DateTime         @default(now()) @map("created_at")

  recipient User   @relation("NotificationRecipient", fields: [recipientId], references: [id], onDelete: Cascade)
  actor     User   @relation("NotificationActor", fields: [actorId], references: [id], onDelete: Cascade)
  tweet     Tweet? @relation(fields: [tweetId], references: [id], onDelete: Cascade)

  @@index([recipientId, createdAt(sort: Desc), id(sort: Desc)])
  @@index([recipientId, readAt])
  @@map("notifications")
}
```

### Migration sequence

| # | Migration | Introduced by |
|---|---|---|
| 1 | `users_and_sessions` | authentication (Phase 1) |
| 2 | `tweets` | tweets (Phase 3) |
| 3 | `follows` (with self-follow `CHECK`) | follows (Phase 3) |
| 4 | `likes` | likes (Phase 4) |
| 5 | `user_search_trgm` (`pg_trgm` extension + GIN trigram indexes on `username`, `display_name`) | search (Phase 6) |
| 6 | `tweet_image_key` (`tweets.image_key`) | tweet images (Phase 7) |
| 7 | `user_avatar_key` (`users.avatar_key`) | avatar uploads (Phase 7) |
| 8 | `tweet_replies` (`tweets.parent_id` + index) | reply threads (Phase 7b) |
| 9 | `notifications` (with `REPLY`) | notifications (Phase 8) |

## 5. API contracts

All routes are prefixed with `/api` and exchange JSON. 🔒 = requires a session. Zod schemas for every body, query and response live in `packages/shared/src/schemas` and are added by the feature that introduces the endpoint.

### 5.1 DTOs

```ts
UserSummary  = { id, username, displayName, avatarUrl: string | null }
SessionUser  = UserSummary & { email, bio, createdAt }            // the signed-in user, as seen by themselves
UserProfile  = UserSummary & { bio, createdAt, followersCount, followingCount, tweetsCount, isFollowing: boolean, isMe: boolean }   // tweetsCount: top-level chirps only (C54)
Tweet        = { id, content, imageUrl: string | null, createdAt, author: UserSummary, likeCount, likedByMe: boolean,
                 replyCount, replyTo: { id, author: UserSummary } | null }   // reply fields from C54
Notification = { id, type: 'FOLLOW' | 'LIKE' | 'REPLY', actor: UserSummary, tweet: { id, content } | null, readAt: string | null, createdAt }
               // REPLY: `tweet` is the reply itself
Page<T>      = { items: T[], nextCursor: string | null }
```

### 5.2 Endpoints

| Method | Path | Auth | Input | Response | Notes |
|---|---|---|---|---|---|
| GET | `/health` | — | — | `200 { status: 'ok' }` | liveness: no dependency checks |
| GET | `/health/ready` | — | — | `200 { status: 'ok', checks }` or `503` | readiness: checks the database (added in C09) |
| POST | `/auth/register` | — | `{ email, username, displayName, password }` | `201 { user: UserSummary }` + cookie | 409 on taken email/username; password 8–72 chars; rate limited |
| POST | `/auth/login` | — | `{ email, password }` | `200 { user: UserSummary }` + cookie | generic 401; rate limited |
| POST | `/auth/logout` | — | — | `204` | idempotent: deletes the current session (if any) and clears the cookie |
| GET | `/auth/me` | 🔒 | — | `200 { user: SessionUser }` | includes the private email; public profiles with counts come from `GET /users/:username` |
| GET | `/users/search` | 🔒 | `?q=&cursor=&limit=` | `200 Page<UserSummary & { isFollowing }>` | `q` 1–50 chars after trimming and dropping a leading `@`; matches username or display name; exact username, then username prefix, then the rest |
| GET | `/users/:username` | 🔒 | — | `200 UserProfile` | 404 |
| PATCH | `/users/me` | 🔒 | `{ displayName?, bio?, avatarKey?: string \| null }` | `200 UserProfile` | `avatarKey` ownership verified |
| GET | `/users/:username/tweets` | 🔒 | `?cursor=&limit=` | `200 Page<Tweet>` | top-level chirps only (ADR-24) |
| GET | `/users/:username/followers` | 🔒 | `?cursor=&limit=` | `200 Page<UserSummary & { isFollowing }>` | cursor on `(follow.createdAt, userId)` |
| GET | `/users/:username/following` | 🔒 | `?cursor=&limit=` | `200 Page<UserSummary & { isFollowing }>` | |
| POST | `/users/:username/follow` | 🔒 | — | `200 { isFollowing: true, followersCount }` | idempotent; 400 on self-follow; notifies |
| DELETE | `/users/:username/follow` | 🔒 | — | `200 { isFollowing: false, followersCount }` | idempotent; removes notification |
| GET | `/timeline` | 🔒 | `?cursor=&limit=` | `200 Page<Tweet>` | followed users + self; top-level chirps only (ADR-24) |
| POST | `/tweets` | 🔒 | `{ content, imageKey? }` | `201 Tweet` | 1–280 code points after trim; content required even with an image |
| GET | `/tweets/:id` | 🔒 | — | `200 Tweet` | 404 |
| DELETE | `/tweets/:id` | 🔒 | — | `204` | 403 if not the author; image deleted best-effort; its replies cascade (ADR-24) |
| POST | `/tweets/:id/replies` | 🔒 | `{ content, imageKey? }` | `201 Tweet` | same rules as `POST /tweets`; 404 on a missing parent; notifies the parent's author unless self |
| GET | `/tweets/:id/replies` | 🔒 | `?cursor=&limit=` | `200 Page<Tweet>` | direct replies, **oldest first** (ascending keyset on `(createdAt, id)`); 404 |
| GET | `/tweets/:id/ancestors` | 🔒 | — | `200 { items: Tweet[] }` | the chirps above it, root first, at most the 20 nearest; when capped, the first item's `replyTo` still points further up; 404 |
| POST | `/tweets/:id/like` | 🔒 | — | `200 { liked: true, likeCount }` | idempotent; notifies author unless self |
| DELETE | `/tweets/:id/like` | 🔒 | — | `200 { liked: false, likeCount }` | idempotent; removes notification |
| POST | `/uploads/presign` | 🔒 | `{ purpose: 'tweet' \| 'avatar', contentType, size }` | `200 { uploadUrl, key }` | 400 on invalid type/size |
| GET | `/notifications` | 🔒 | `?cursor=&limit=` | `200 Page<Notification>` | |
| GET | `/notifications/unread-count` | 🔒 | — | `200 { count }` | |
| POST | `/notifications/read` | 🔒 | — | `204` | marks all as read |

Pagination: `limit` defaults to 20, maximum 50; `cursor` is opaque (ADR-11).

## 6. Frontend

### 6.1 Routes

| Path | Page | Access |
|---|---|---|
| `/` | redirects to `/home` or `/login` | — |
| `/login`, `/register` | authentication | guests only (redirect to `/home` when signed in) |
| `/home` | composer + timeline | signed in |
| `/search` | user search | signed in |
| `/notifications` | notifications | signed in |
| `/:username` | profile + tweets | signed in |
| `/:username/followers`, `/:username/following` | follow lists | signed in |
| `/:username/status/:tweetId` | chirp detail: ancestors, the chirp, its replies and a reply composer (C57) | signed in |
| `*` (any other path) | not found, inside the shell | signed in |

Every page is code-split with the route's `lazy`. Static segments outrank `/:username`, so their names are reserved usernames (ADR-18).

### 6.2 Responsive layout

| Viewport | Layout |
|---|---|
| `< 640px` | top bar (avatar + logo); full-width feed; **bottom navigation** (Home, Search, Notifications, Profile); **floating action button** opens a full-screen composer |
| `640–1024px` | icon-only left sidebar with a compose button; centered feed (max ~600px); no right panel |
| `> 1024px` | left sidebar with labels; center feed; **right panel** with search and "who to follow" |

### 6.3 Interaction rules

- Infinite scroll: `useInfiniteQuery` + an `IntersectionObserver` sentinel; explicit loading, empty, error and end-of-feed states.
- Scroll: `ScrollRestoration` in the app shell returns the reader to the same place on back and forward, and starts every new page at the top.
- Likes and follows are **optimistic** with rollback (`onMutate` / `onError` / `onSettled`).
- Composer: a text counter in code points ("N characters left" / "N over the limit", tabular, tied to the field with `aria-describedby`); disabled when empty or over 280; ⌘/Ctrl+Enter posts; inline on home from `sm` up and in the compose modal everywhere; image attach with preview and progress.
- A newly created tweet is inserted into the first timeline page in the cache (no full refetch).
- A new reply bumps its parent's `replyCount` in every cached `Page<Tweet>` and is appended to the parent's loaded replies; it is not inserted into the home timeline, which lists top-level chirps only. Replies are written only on the conversation page: a chirp's reply action is a link there (history state `{ focusReply: true }`, Zod-validated, puts the cursor in the reply box), so the compose modal is for new chirps only.
- Route guards (`ProtectedRoute`, `GuestRoute`, `SessionRedirect` in `features/auth/components/`) read the session query. A 401 from any request sets `['auth', 'me']` to `null`, so `ProtectedRoute` redirects to `/login` with the page in history state (`{ from }`, validated as an in-app path) and signing in returns there. Creating an account always opens `/search`; signing out opens `/login` with nothing to return to.
- Signing in or out changes the session and then navigates; while those mutations run (`authKeys.signIn` / `authKeys.signOut`), the guards do not redirect. `AppRouter` renders navigations without React transitions so the new page commits before the mutation settles.
- Signing in drops every cached query but the session; signing out drops them all, so one account's data never reaches the next.
- The session request starts when the app loads (`prefetchSession`), in parallel with the first route's code.
- Accessibility: labelled controls, visible focus, `aria-pressed` on like/follow toggles, keyboard navigation, WCAG AA contrast.

## 7. Testing strategy

| Layer | Tooling | What is verified |
|---|---|---|
| Shared | Vitest | schema boundaries: 280 code points including emoji, username pattern, password rules |
| API unit | Vitest | password hashing, token generation/hashing, cursor encode/decode (malformed → 400), serializers, service rules |
| API integration | Vitest + `app.inject` + PostgreSQL `chirp_test` | every endpoint: success, 401, 403, 404, 409, validation; pagination (no duplicates or gaps across pages, tie-breaking by id); cascades; idempotency; notification rules |
| Web integration | Vitest + React Testing Library + user-event + MSW | login (success/failure), registration, route protection, composing (counter, limit), infinite scroll, optimistic like with rollback, follow, search, replies and thread view, notifications |
| End-to-end | Playwright (Chromium) against the running stack | full auth flow (register → home → logout → login → protected route redirects when signed out); compose a tweet; follow a user and see their tweets on the home timeline; reply to a chirp and see it in the thread |

- **API helpers:** `buildTestApp()` (with `MemoryStorage`), factories (`createUser`, `createTweet`, `follow`, `like`), `loginAs(user)` returning a session cookie.
- **Isolation:** `TRUNCATE … CASCADE` before each test; test files run serially.
- **E2E:** `globalSetup` resets and seeds the test database; Playwright's `webServer` starts the API and web app.
- **CI (`.github/workflows/ci.yml`):** `npm ci` → `npm run verify` → coverage table in the job summary. Actions are pinned by commit SHA; the job has read-only permissions. A PostgreSQL service and migrations join in C09; an E2E job (with the storage service, since the seed uploads avatars) joins in C49.
- **Thresholds** (the run fails below them): API 85% lines/functions/statements and 80% branches; web 70%.

## 8. Environments and configuration

### 8.1 Docker Compose services

| Service | Image | Host ports | Purpose |
|---|---|---|---|
| `db` | `postgres:16.16-alpine` | 5433 → 5432 | development and test databases (`init.sql` creates `chirp_test`) |
| `storage` | `rustfs/rustfs:1.0.6` | 9000 (S3 API), 9001 (console) | S3-compatible object storage |
| `storage-init` | `amazon/aws-cli:2.42.0` | — | creates bucket `chirp-media`, public-read policy (objects only) and CORS, then exits; idempotent |
| `api` | `apps/api/Dockerfile` | — (not published) | entrypoint: `prisma migrate deploy` → seed if `users` is empty, only when `SEED_DEMO_DATA=true` (ADR-23) → server |
| `web` | `apps/web/Dockerfile` (nginx) | **8080** (`WEB_PORT`) | serves the SPA with its security headers and proxies `/api` to `api:3000` |

- **One command:** `docker compose up --build` → <http://localhost:8080>.
- **Images** are built from the repository root. The API image is `node:22.23.5-bookworm-slim` with the tsup bundles, runtime dependencies only (the Prisma CLI among them, for `migrate deploy`), OpenSSL for Prisma's migration engine, and the non-root `node` user. The web image is `nginx:1.30.7-alpine` serving the Vite build.
- **`api` reads no `.env`:** compose sets its variables (`db:5432`, `http://storage:9000`, `WEB_ORIGINS=http://localhost:8080`, `TRUST_PROXY=true`, JSON logs, `SEED_DEMO_DATA=true`), because `.env` holds host addresses for `npm run dev`. Its port is not published: the browser reaches it only through `web` (ADR-17), and port 3000 stays free for `npm run dev`.
- **Web headers (ADR-17):** a Content-Security-Policy that allows inline code only by hash (the appearance script in `index.html` and the stylesheet Sonner injects; `nginx/csp.test.ts` fails when either drifts), images and uploads from the storage's public origin (`STORAGE_PUBLIC_ORIGIN`), `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy` and `Permissions-Policy`. Hashed `/assets/` are cached for a year as `immutable`; `index.html` is always revalidated.
- **Development:** `npm run services:up` (= `docker compose up -d db storage storage-init`), then `npm run dev` → <http://localhost:5173>.
- Works with Docker 20.10 / Compose v2.0: `depends_on` health conditions are supported; the top-level `name:` key is not, so the project name comes from `COMPOSE_PROJECT_NAME`.
- Host ports are configurable (`POSTGRES_PORT`, `STORAGE_PORT`, `STORAGE_CONSOLE_PORT`) in case they are taken.

### 8.2 Environment variables (`.env.example`)

`DATABASE_URL` and the storage endpoints and credentials have no defaults in `env.ts`: the API refuses to start without them, so a deploy cannot fall back to local values. Every other variable defaults to its example value.

| Variable | Example | Description |
|---|---|---|
| `API_PORT` | `3000` | API port |
| `API_HOST` | `0.0.0.0` | API bind address |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent` |
| `LOG_PRETTY` | `true` | human-readable logs (`false` emits JSON for log aggregation) |
| `DATABASE_URL` | `postgresql://chirp:chirp@localhost:5433/chirp` | main database |
| `TEST_DATABASE_URL` | `postgresql://chirp:chirp@localhost:5433/chirp_test` | test and E2E database |
| `WEB_ORIGINS` | `http://localhost:5173` | comma-separated browser origins allowed to make state-changing requests (CSRF defense) |
| `TRUST_PROXY` | `false` | `true` only behind a reverse proxy: the client IP for rate limiting comes from `X-Forwarded-For` |
| `RATE_LIMIT_GLOBAL_MAX` | `300` | requests per minute per IP, on every route |
| `RATE_LIMIT_AUTH_MAX` | `10` | attempts per minute on sign-in (per IP + email) and sign-up (per IP) |
| `SESSION_TTL_DAYS` | `30` | session lifetime (sliding) |
| `COOKIE_SECURE` | `false` | `true` behind HTTPS (also enables HSTS) |
| `S3_ENDPOINT` | `http://localhost:9000` | **required**; storage endpoint used by the API (`http://storage:9000` inside Docker) |
| `S3_PUBLIC_ENDPOINT` | `http://localhost:9000` | **required**; storage endpoint reachable by the browser |
| `S3_REGION` | `us-east-1` | bucket region |
| `S3_BUCKET` | `chirp-media` | bucket name |
| `S3_ACCESS_KEY_ID` | `chirp` | **required**; storage access key (`STORAGE_ROOT_USER` locally) |
| `S3_SECRET_ACCESS_KEY` | `chirpsecret` | **required**; storage secret key |
| `S3_FORCE_PATH_STYLE` | `true` | path-style URLs, required by local S3-compatible storage |
| `UPLOAD_MAX_BYTES` | `5242880` | maximum image size (5 MB) |
| `COMPOSE_PROJECT_NAME` | `chirp` | fixes container/volume names regardless of the folder name |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `chirp` / `chirp` / `chirp` | database container credentials |
| `POSTGRES_PORT` | `5433` | host port for PostgreSQL |
| `STORAGE_ROOT_USER` / `STORAGE_ROOT_PASSWORD` | `chirp` / `chirpsecret` | storage root credentials (docker-compose) |
| `STORAGE_PORT` / `STORAGE_CONSOLE_PORT` | `9000` / `9001` | host ports for the S3 API and web console |
| `STORAGE_BUCKET` | `chirp-media` | bucket created by `storage-init` |
| `STORAGE_CORS_ORIGINS` | `http://localhost:5173,http://localhost:8080` | origins allowed to upload with presigned URLs |
| `WEB_PORT` | `8080` | host port of the Docker web app (add a changed origin to `STORAGE_CORS_ORIGINS`) |

`SEED_DEMO_DATA` is not an application variable: only the API image's entrypoint reads it, and only `docker-compose.yml` sets it (ADR-23).

### 8.3 Root scripts

| Script | Runs |
|---|---|
| `services:up` / `services:down` | start local PostgreSQL + storage (with bucket setup) / stop them, keeping data |
| `dev` | API (`tsx watch`, :3000) and web (`vite`, :5173, proxying `/api`) concurrently |
| `build` | production builds: API bundles (tsup, `apps/api/dist` and `apps/api/prisma/dist`), then the web app (`apps/web/dist`) |
| `db:migrate` | `prisma migrate dev` |
| `db:generate` | `prisma generate` (also runs on `postinstall`) |
| `db:seed` | `prisma db seed` → `prisma/seed.ts`: replaces application data with the demo data set |
| `lint` / `typecheck` | across all workspaces |
| `test` | shared, API and web tests |
| `test:coverage` | the same, enforcing coverage thresholds |
| `test:e2e` | Playwright |
| `verify` | `lint` + `format:check` + `typecheck` + `test:coverage` |

## 9. Seed data

Target state once every feature is in place; each phase extends the seed with the data its feature needs.

- Deterministic and hand-written (`prisma/seed-data/`): every persona has a coherent name, username and bio, and later stages (tweets, follows, likes) build on those themes. Fixed join dates keep runs identical. The only generated stage is cross-likes, picked by a seeded generator from the follow graph (`seed-data/likes.ts`), so they too are identical on every run.
- **12 users** with coherent personas (developer, designer, photographer, runner, chef…), matching bios and DiceBear avatars ("Notionists", CC0 1.0), generated by `npm run avatars:generate -w @chirp/api` into `prisma/seed-assets/avatars/` and uploaded as `seed/avatars/<username>.svg`.
- **Demo account:** `demo@chirp.dev` / `Password123!` (username `demo`). Every seed user shares the password `Password123!`; their emails are listed in the README.
- 8–15 tweets per user, written to match the persona, spread over the last 30 days.
- Follow graph: `demo` follows 8 users; every user follows 4–9 others; no self-follows.
- Cross-likes: each user likes 10–30 tweets from people they follow, timed after both the chirp and the liker's join date.
- Reply threads (`seed-data/replies.ts`): 9 hand-written conversations (31 replies) under recent chirps, up to three replies deep, including self-threads and replies on `demo`'s chirps; whoever replies is connected to the person answered by a follow in at least one direction; each reply is timed some minutes after the chirp it answers, clamped to `now`.
- Notifications consistent with the generated follows, likes and replies (never self-notifications), with some unread for `demo`.
- Two modes: `npm run db:seed` **replaces** application data (idempotent: every table cascades from `users`), but refuses when the database holds accounts the seed did not create unless `SEED_CONFIRM_RESET=<database name>` is set (ADR-23); `--if-empty` seeds only an empty database; the Docker entrypoint runs it (as the bundled `prisma/dist/seed.js`) when `SEED_DEMO_DATA=true`, so restarting a container never wipes data. There is no `db:reset`: schema resets (`prisma migrate reset`) are destructive, blocked for AI agents, and left to deliberate human use.
- Every account gets its own argon2 hash; a test signs in with the documented demo credentials so documentation and data cannot drift.
- Requires the storage service (avatars are uploaded); if storage is unreachable it fails with a message pointing to the runbook command.
