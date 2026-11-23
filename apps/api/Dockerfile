# Production image for the Chirp API. Build from the repository root:
#   docker build -f apps/api/Dockerfile .
# glibc (Debian) rather than Alpine: Prisma's migration engine and @node-rs/argon2 ship
# prebuilt binaries for it without musl or OpenSSL workarounds.
FROM node:22.23.5-bookworm-slim AS base
WORKDIR /app
ENV npm_config_update_notifier=false \
    npm_config_fund=false \
    npm_config_audit=false \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1
# Prisma picks its migration engine by the OpenSSL it finds, so the stage that downloads the
# engine and the stage that runs it must both have it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Every workspace manifest, so npm ci can match the lockfile.
FROM base AS manifests
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

# Bundles the server and the seed with tsup (ADR-20).
FROM manifests AS build
# Scripts are skipped: husky needs a git checkout, and the Prisma client is generated below.
RUN npm ci --ignore-scripts
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run db:generate -w @chirp/api && npm run build -w @chirp/api

# Runtime dependencies only. The Prisma CLI is one of them: the entrypoint runs `migrate deploy`.
FROM manifests AS runtime-deps
RUN npm ci --omit=dev --ignore-scripts --workspace @chirp/api \
    # Downloads the migration engine for this platform (skipped above with every other script).
    && npm rebuild @prisma/engines \
    # npm only creates the workspace's own folder when a dependency cannot be hoisted.
    && mkdir -p apps/api/node_modules

FROM base AS runtime
ENV NODE_ENV=production \
    PATH=/app/node_modules/.bin:$PATH
COPY --from=runtime-deps /app/node_modules ./node_modules
WORKDIR /app/apps/api
COPY --from=runtime-deps /app/apps/api/node_modules ./node_modules
COPY apps/api/package.json apps/api/prisma.config.ts ./
COPY apps/api/prisma/schema.prisma ./prisma/schema.prisma
COPY apps/api/prisma/migrations ./prisma/migrations
COPY apps/api/prisma/seed-assets ./prisma/seed-assets
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma/dist ./prisma/dist
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
USER node
EXPOSE 3000
# Through sh, so the script needs no executable bit (COPY --chmod requires a newer builder).
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
