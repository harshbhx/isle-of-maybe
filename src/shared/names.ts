// Original island names for each day (ENG-2.9). Never "Isle of …": that's the game's own name.
import { pick, type Rng } from './rng.ts';

const STEMS = [
  'Gull',
  'Brine',
  'Crooked',
  'Salt',
  'Driftwood',
  'Tern',
  'Coral',
  'Kelp',
  'Lantern',
  'Barnacle',
  'Pelican',
  'Moss',
  'Cinder',
  'Hollow',
  'Copper',
  'Mist',
  'Puffin',
  'Ember',
  'Saffron',
  'Tamarind',
  'Monsoon',
  'Pepper',
  'Cardamom',
  'Mango',
  'Oyster',
  'Anchor',
  'Biscuit',
  'Thimble',
  'Marrow',
  'Juniper',
  'Sorrel',
  'Pebble',
  'Bramble',
  'Tinder',
] as const;

const PATTERNS: readonly ((s: string) => string)[] = [
  (s) => `${s}rock`,
  (s) => `${s}wick`,
  (s) => `The ${s} Key`,
  (s) => `${s} Reach`,
  (s) => `${s} Cay`,
  (s) => `${s}holm`,
  (s) => `${s} Shoals`,
  (s) => `${s}mouth`,
  (s) => `Little ${s}`,
  (s) => `${s} Point`,
];

export const islandName = (rng: Rng): string => {
  const stem = pick(rng, STEMS);
  const make = pick(rng, PATTERNS);
  return make(stem);
};
