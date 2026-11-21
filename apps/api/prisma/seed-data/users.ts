// Demo personas. Each one has a coherent identity so the data reads like a real community;
// later seed stages (tweets, follows, likes) build on these themes.

/** Shared by every seed account; documented in the README. */
export const SEED_PASSWORD = 'Password123!';
export const SEED_EMAIL_DOMAIN = 'chirp.dev';
export const DEMO_USERNAME = 'demo';

export interface SeedPersona {
  username: string;
  displayName: string;
  bio: string;
  joinedAt: string;
}

export const seedPersonas: SeedPersona[] = [
  {
    username: DEMO_USERNAME,
    displayName: 'Demo User',
    bio: 'Exploring Chirp. Say hi! 👋',
    joinedAt: '2026-11-01T09:00:00.000Z',
  },
  {
    username: 'ana_codes',
    displayName: 'Ana Torres',
    bio: 'Frontend dev · TypeScript & accessibility nerd · Bogotá',
    joinedAt: '2026-03-12T14:20:00.000Z',
  },
  {
    username: 'marco_lens',
    displayName: 'Marco Rossi',
    bio: 'Street photographer. Film when I can afford it. 📷',
    joinedAt: '2026-04-02T18:45:00.000Z',
  },
  {
    username: 'lucia_data',
    displayName: 'Lucía Fernández',
    bio: 'Data scientist. I turn messy CSVs into slightly less messy charts.',
    joinedAt: '2026-04-21T08:10:00.000Z',
  },
  {
    username: 'kenji_cooks',
    displayName: 'Kenji Watanabe',
    bio: 'Ramen chef by day, bread experimenter by night 🍜',
    joinedAt: '2026-05-05T22:30:00.000Z',
  },
  {
    username: 'sofia_ux',
    displayName: 'Sofía Morales',
    bio: 'UX designer · Research first, pixels second · Always sketching',
    joinedAt: '2026-05-19T11:00:00.000Z',
  },
  {
    username: 'dave_runs',
    displayName: 'David Okafor',
    bio: 'Marathon coach. Slow miles are still miles. 🏃',
    joinedAt: '2026-06-08T06:15:00.000Z',
  },
  {
    username: 'amara_climate',
    displayName: 'Amara Nwosu',
    bio: 'Climate researcher studying coastal resilience 🌊',
    joinedAt: '2026-06-30T16:40:00.000Z',
  },
  {
    username: 'liam_pixels',
    displayName: 'Liam Becker',
    bio: 'Indie game dev making a cozy farming game, one bug at a time 🎮',
    joinedAt: '2026-07-14T20:05:00.000Z',
  },
  {
    username: 'priya_ships',
    displayName: 'Priya Raman',
    bio: 'Product manager · Shipping small things often · Notes on building teams',
    joinedAt: '2026-08-03T13:25:00.000Z',
  },
  {
    username: 'mateo_beats',
    displayName: 'Mateo Silva',
    bio: 'Producer & bassist. Lo-fi on weekdays, salsa on weekends 🎶',
    joinedAt: '2026-08-27T19:50:00.000Z',
  },
  {
    username: 'chloe_wanders',
    displayName: 'Chloé Martin',
    bio: 'Travel writer · 41 countries and counting · Coffee snob ☕',
    joinedAt: '2026-09-15T10:35:00.000Z',
  },
];
