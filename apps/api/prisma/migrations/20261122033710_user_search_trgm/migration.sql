-- Hand-written (created with --create-only): Prisma does not manage extensions. The indexes are
-- also declared in schema.prisma, or the next `migrate dev` would drop them (ADR-04).

-- Trigram matching for case-insensitive substring search (ADR-04). Trusted since PostgreSQL 13,
-- so the database owner can enable it without superuser rights.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Serve ILIKE '%q%' on usernames and display names (GET /users/search).
CREATE INDEX "users_username_trgm_idx" ON "users" USING GIN ("username" gin_trgm_ops);
CREATE INDEX "users_display_name_trgm_idx" ON "users" USING GIN ("display_name" gin_trgm_ops);
