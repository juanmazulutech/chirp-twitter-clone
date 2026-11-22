import { Prisma } from '../generated/prisma/client';

/** True when a write violated a unique constraint (Prisma error P2002). */
export function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** Whether a unique violation involved the given column (driver adapters report it in `meta`). */
export function violatesUniqueColumn(
  error: Prisma.PrismaClientKnownRequestError,
  column: string,
): boolean {
  return JSON.stringify(error.meta ?? {}).includes(column);
}

/** True when a write referenced a row that no longer exists (Prisma error P2003). */
export function isForeignKeyViolation(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}
