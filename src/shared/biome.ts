// Daily biomes (ADV-10.1): how each day's island is dressed. Derived from the seed alone and
// used only by renderers and labels, so no tile, rule or score changes and posted days never move.
import { hash32 } from './rng.ts';

export const BIOMES = [
  'tropical',
  'volcanic',
  'autumn',
  'mangrove',
  'frost',
  'coral',
] as const;

export type Biome = (typeof BIOMES)[number];

// The salt was picked once so the launch fortnight opens Tropical, shows all six biomes and never
// repeats on two days in a row. Changing it would re-dress posted days, so it stays fixed.
const SALT = 'biome3498';

export const biomeFor = (seed: string): Biome =>
  BIOMES[hash32(`${seed}:${SALT}`) % BIOMES.length] ?? 'tropical';
