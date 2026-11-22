// Who follows whom, by username. Hand-built around shared interests (developers, designers
// and product people; photography and travel; food and running; data and climate) so every
// timeline reads like a real circle of friends rather than a random sample.
import { DEMO_USERNAME } from './users';

export const seedFollows: Record<string, string[]> = {
  [DEMO_USERNAME]: [
    'ana_codes',
    'marco_lens',
    'lucia_data',
    'kenji_cooks',
    'sofia_ux',
    'dave_runs',
    'liam_pixels',
    'chloe_wanders',
  ],
  ana_codes: ['sofia_ux', 'lucia_data', 'priya_ships', 'liam_pixels', DEMO_USERNAME, 'mateo_beats'],
  marco_lens: ['chloe_wanders', 'kenji_cooks', 'mateo_beats', 'amara_climate', 'sofia_ux'],
  lucia_data: ['ana_codes', 'amara_climate', 'priya_ships', 'liam_pixels', 'dave_runs'],
  kenji_cooks: ['marco_lens', 'chloe_wanders', 'dave_runs', 'mateo_beats'],
  sofia_ux: [
    'ana_codes',
    'priya_ships',
    'marco_lens',
    'liam_pixels',
    'lucia_data',
    'chloe_wanders',
    DEMO_USERNAME,
  ],
  dave_runs: ['kenji_cooks', 'amara_climate', 'chloe_wanders', 'lucia_data'],
  amara_climate: ['lucia_data', 'chloe_wanders', 'dave_runs', 'marco_lens', 'priya_ships'],
  liam_pixels: [
    'ana_codes',
    'mateo_beats',
    'sofia_ux',
    'lucia_data',
    'marco_lens',
    'priya_ships',
    'kenji_cooks',
    DEMO_USERNAME,
    'amara_climate',
  ],
  priya_ships: ['ana_codes', 'sofia_ux', 'lucia_data', 'liam_pixels', 'dave_runs', 'amara_climate'],
  mateo_beats: ['liam_pixels', 'marco_lens', 'kenji_cooks', 'chloe_wanders'],
  chloe_wanders: [
    'marco_lens',
    'kenji_cooks',
    'amara_climate',
    'mateo_beats',
    'dave_runs',
    'sofia_ux',
  ],
};
