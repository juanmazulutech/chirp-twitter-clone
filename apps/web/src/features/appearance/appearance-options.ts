import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react';

import { type Appearance, appearanceSchema } from './appearance';

export interface AppearanceOption {
  value: Appearance;
  label: string;
  description: string;
  icon: LucideIcon;
}

const optionsByValue: Record<Appearance, AppearanceOption> = {
  system: {
    value: 'system',
    label: 'System',
    description: 'Match this device’s light or dark setting',
    icon: Monitor,
  },
  light: { value: 'light', label: 'Light', description: 'Airmail paper and navy ink', icon: Sun },
  dark: { value: 'dark', label: 'Dark', description: 'A navy envelope with paper ink', icon: Moon },
};

/** In the order the dialog lists them. */
export const appearanceOptions = appearanceSchema.options.map((value) => optionsByValue[value]);

export function appearanceOption(appearance: Appearance): AppearanceOption {
  return optionsByValue[appearance];
}
