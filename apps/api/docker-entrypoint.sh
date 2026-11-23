#!/bin/sh
# Starts the API container: apply pending migrations, seed the demo data only when this
# deployment opted in (ADR-23), then hand the process over to the server.
set -eu

prisma migrate deploy

# Only docker-compose.yml sets this. A production deploy never creates the demo accounts, whose
# password is published. --if-empty leaves an existing database untouched on every restart.
if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  node --enable-source-maps prisma/dist/seed.js --if-empty
fi

# exec: the server becomes PID 1 and receives SIGTERM directly (graceful shutdown).
exec node --enable-source-maps dist/server.js
