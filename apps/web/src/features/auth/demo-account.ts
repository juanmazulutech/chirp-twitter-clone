/**
 * The seeded demo account (apps/api/prisma/seed-data/users.ts), offered on the sign-in
 * screen so anyone evaluating Chirp can look around without signing up. These credentials
 * are public by design: they only exist in seeded development and demo databases.
 */
export const DEMO_ACCOUNT = { email: 'demo@chirp.dev', password: 'Password123!' } as const;
