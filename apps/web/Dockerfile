# Production image for the Chirp web app: the Vite build served by nginx, which also proxies
# /api to the API so the browser talks to a single origin (ADR-17). Build from the repository root:
#   docker build -f apps/web/Dockerfile .
FROM node:22.23.5-bookworm-slim AS build
WORKDIR /app
ENV npm_config_update_notifier=false \
    npm_config_fund=false \
    npm_config_audit=false
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
# Scripts are skipped: husky needs a git checkout and the web build needs no Prisma client.
RUN npm ci --ignore-scripts
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @chirp/web

FROM nginx:1.30.7-alpine AS runtime
# Origin the browser loads images from and uploads to (S3_PUBLIC_ENDPOINT), allowed by the CSP.
ENV STORAGE_PUBLIC_ORIGIN=http://localhost:9000
# The image renders /etc/nginx/templates/*.template into /etc/nginx/conf.d/ at startup,
# substituting only variables that are set, so nginx's own $variables are left alone.
COPY apps/web/nginx/default.conf.template apps/web/nginx/security-headers.inc.template /etc/nginx/templates/
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
