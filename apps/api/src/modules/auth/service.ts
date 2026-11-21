import type { FieldErrors, LoginBody, RegisterBody } from '@chirp/shared';

import type { PrismaClient, User } from '../../generated/prisma/client';
import { ConflictError, UnauthenticatedError } from '../../lib/errors';
import { hashPassword, verifyPassword, verifyPasswordAgainstNothing } from '../../lib/password';
import { isUniqueViolation, violatesUniqueColumn } from '../../lib/prisma-errors';
import { isSessionExpired, sessionExpiresAt, shouldRenewSession } from '../../lib/session-policy';
import { generateSessionToken, hashSessionToken } from '../../lib/tokens';

export interface AuthServiceDependencies {
  prisma: PrismaClient;
  sessionTtlDays: number;
  /** Injectable clock for deterministic tests. */
  now?: () => Date;
}

export interface StartedSession {
  token: string;
  expiresAt: Date;
}

export interface AuthenticatedSession {
  user: User;
  /** Set when the session was extended (sliding expiration); the cookie must be re-issued. */
  renewedExpiresAt: Date | null;
}

const EMAIL_TAKEN = 'This email is already registered';
const USERNAME_TAKEN = 'This username is taken';
const INVALID_CREDENTIALS = 'Invalid email or password';

export type AuthService = ReturnType<typeof createAuthService>;

export function createAuthService({
  prisma,
  sessionTtlDays,
  now = () => new Date(),
}: AuthServiceDependencies) {
  async function createSession(userId: string): Promise<StartedSession> {
    const token = generateSessionToken();
    const expiresAt = sessionExpiresAt(now(), sessionTtlDays);
    await prisma.session.create({
      data: { userId, tokenHash: hashSessionToken(token), expiresAt },
    });
    return { token, expiresAt };
  }

  async function endSession(token: string): Promise<void> {
    await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }

  async function register(input: RegisterBody): Promise<StartedSession & { user: User }> {
    // Check both fields up front so the form can show every conflict at once.
    const taken = await prisma.user.findMany({
      where: { OR: [{ email: input.email }, { username: input.username }] },
      select: { email: true, username: true },
    });
    const fieldErrors: FieldErrors = {};
    if (taken.some((user) => user.email === input.email)) fieldErrors.email = [EMAIL_TAKEN];
    if (taken.some((user) => user.username === input.username)) {
      fieldErrors.username = [USERNAME_TAKEN];
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new ConflictError('Email or username is already taken', { fieldErrors });
    }

    const passwordHash = await hashPassword(input.password);
    let user: User;
    try {
      user = await prisma.user.create({
        data: {
          email: input.email,
          username: input.username,
          displayName: input.displayName,
          passwordHash,
        },
      });
    } catch (error) {
      // A concurrent registration claimed the email or username after the check above.
      if (!isUniqueViolation(error)) throw error;
      const field = violatesUniqueColumn(error, 'email') ? 'email' : 'username';
      throw new ConflictError('Email or username is already taken', {
        fieldErrors: { [field]: [field === 'email' ? EMAIL_TAKEN : USERNAME_TAKEN] },
        cause: error,
      });
    }

    return { user, ...(await createSession(user.id)) };
  }

  async function login(input: LoginBody): Promise<StartedSession & { user: User }> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // An unknown email still costs one argon2 verification, so timing reveals nothing.
    const valid = user
      ? await verifyPassword(user.passwordHash, input.password)
      : await verifyPasswordAgainstNothing(input.password);

    if (!user || !valid) throw new UnauthenticatedError(INVALID_CREDENTIALS);
    return { user, ...(await createSession(user.id)) };
  }

  /** Resolves a session token to its user, expiring or renewing the session as needed. */
  async function authenticate(token: string): Promise<AuthenticatedSession | null> {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true },
    });
    if (!session) return null;

    const current = now();
    if (isSessionExpired(session.expiresAt, current)) {
      await prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }

    if (!shouldRenewSession(session.expiresAt, current, sessionTtlDays)) {
      return { user: session.user, renewedExpiresAt: null };
    }

    const expiresAt = sessionExpiresAt(current, sessionTtlDays);
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt } });
    return { user: session.user, renewedExpiresAt: expiresAt };
  }

  return { register, login, authenticate, createSession, endSession };
}
