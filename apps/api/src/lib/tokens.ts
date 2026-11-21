import { createHash, randomBytes } from 'node:crypto';

const SESSION_TOKEN_BYTES = 32;

/** 256 bits of randomness, base64url-encoded (43 characters, cookie-safe). */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
}

/**
 * The value stored in `sessions.token_hash`. A fast, deterministic hash is correct
 * here: tokens are random (not guessable like passwords), and lookups need the same
 * input to always produce the same indexed value.
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
