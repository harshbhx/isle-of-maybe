// How each daily biome dresses the 3D island (ADV-10.2): ground, plants, sea and sky colours, the
// tree shape, and one ambient touch. Tropical keeps the original look exactly.
import type { Biome } from '../../../../shared/biome.ts';

export type GroundPalette = {
  seabedDeep: number;
  seabed: number;
  wetSand: number;
  sand: number;
  drySand: number;
  grass: number;
  grassDark: number;
  grassLight: number;
  jungleFloor: number;
  rock: number;
  rockDark: number;
  pondBed: number;
};

export type TreeShape = 'broad' | 'pine' | 'mangrove';
export type Ambient = 'none' | 'smoke' | 'leaves' | 'mist' | 'snow' | 'reef';

export type BiomeLook = {
  ground: GroundPalette;
  palmTrunk: readonly [number, number];
  palmLeaf: readonly [number, number];
  treeTrunk: number;
  treeLeaves: readonly [number, number, number];
  tree: TreeShape;
  tuft: readonly [number, number];
  bush: number;
  flowers: readonly [number, number];
  cliff: readonly [number, number];
  /** Share of the usual beach palms; the rest become trees of the biome's shape. */
  palms: number;
  sea: { deep: number; mid: number; shallow: number };
  sky: { zenith: number; horizon: number; hemiSky: number; far: number };
  ambient: Ambient;
  /** Extra gulls on the wind. */
  birds: number;
};

const TROPICAL: BiomeLook = {
  ground: {
    seabedDeep: 0x1d5f63,
    seabed: 0xc9b27a,
    wetSand: 0xd6bb7f,
    sand: 0xf0d9a0,
    drySand: 0xf6e4b5,
    grass: 0x6cbf55,
    grassDark: 0x4f9f42,
    grassLight: 0x8fd36a,
    jungleFloor: 0x3c6b2c,
    rock: 0x8d8379,
    rockDark: 0x6c635b,
    pondBed: 0x5c8f86,
  },
  palmTrunk: [0x8b6a45, 0x7a5b3a],
  palmLeaf: [0x3f9a3c, 0x2f8636],
  treeTrunk: 0x6a4a2c,
  treeLeaves: [0x2c7a35, 0x2f8a3a, 0x256b2e],
  tree: 'broad',
  tuft: [0x5aa844, 0x79c45a],
  bush: 0x2f7d34,
  flowers: [0xd42a4a, 0xffb21e],
  cliff: [0xb3a796, 0xa39684],
  palms: 1,
  sea: { deep: 0x0b4f63, mid: 0x138f97, shallow: 0x5fd6c6 },
  sky: {
    zenith: 0x3d9fd6,
    horizon: 0xd8f0ef,
    hemiSky: 0xcfeefc,
    far: 0x2a8e9b,
  },
  ambient: 'none',
  birds: 0,
};

export const BIOME_LOOKS: Record<Biome, BiomeLook> = {
  tropical: TROPICAL,
  // Black sand, basalt cliffs and a smoking peak.
  volcanic: {
    ...TROPICAL,
    ground: {
      seabedDeep: 0x123c4a,
      seabed: 0x4a4542,
      wetSand: 0x2e2b2a,
      sand: 0x45413e,
      drySand: 0x5a5551,
      // Ash-dusted meadows, so the isle reads as volcanic even far from the cliffs.
      grass: 0x6b7f45,
      grassDark: 0x56693a,
      grassLight: 0x7f9150,
      jungleFloor: 0x334a26,
      rock: 0x4a423e,
      rockDark: 0x2a2421,
      pondBed: 0x3f5f5a,
    },
    cliff: [0x554c47, 0x463e3a],
    treeLeaves: [0x2f6b36, 0x37753c, 0x285c2f],
    tuft: [0x7d8a4f, 0x95a060],
    flowers: [0xe8471f, 0xffa31a],
    sea: { deep: 0x08364c, mid: 0x0f6a7c, shallow: 0x3aa8a0 },
    sky: {
      zenith: 0x5c86ad,
      horizon: 0xe6d5c3,
      hemiSky: 0xd9d4cc,
      far: 0x24707e,
    },
    ambient: 'smoke',
  },
  // Golden meadows and copper woods; leaves drift down.
  autumn: {
    ...TROPICAL,
    ground: {
      ...TROPICAL.ground,
      sand: 0xeccf9a,
      drySand: 0xf1dcae,
      grass: 0xb29a46,
      grassDark: 0x957c34,
      grassLight: 0xcbb25c,
      jungleFloor: 0x6a4a26,
      pondBed: 0x5f7f6e,
    },
    treeTrunk: 0x5a3d24,
    treeLeaves: [0xd0602a, 0xe39632, 0xb33f27],
    tuft: [0xc3a14b, 0xdcbf6a],
    bush: 0x9a5a2a,
    flowers: [0xf2c14e, 0xc2410c],
    palms: 0.25,
    sea: { deep: 0x0d4560, mid: 0x1f7d88, shallow: 0x6cc3b2 },
    sky: {
      zenith: 0x4f92c6,
      horizon: 0xf3dfc0,
      hemiSky: 0xf4e6cf,
      far: 0x2a7f8a,
    },
    ambient: 'leaves',
  },
  // Mud flats, stilt-rooted trees and a low mist over green water.
  mangrove: {
    ...TROPICAL,
    ground: {
      ...TROPICAL.ground,
      seabed: 0x7d7a55,
      seabedDeep: 0x1d4a3e,
      wetSand: 0x8a7f5a,
      sand: 0xb5a676,
      drySand: 0xc8ba8a,
      grass: 0x6e8a3c,
      grassDark: 0x5a7432,
      grassLight: 0x82a04a,
      jungleFloor: 0x2a4b23,
      pondBed: 0x46634a,
    },
    treeTrunk: 0x5b4a36,
    treeLeaves: [0x276838, 0x31783f, 0x1f5a2d],
    tree: 'mangrove',
    tuft: [0x6f8f3e, 0x89a856],
    palms: 0.35,
    sea: { deep: 0x0e463f, mid: 0x26796a, shallow: 0x79bb95 },
    sky: {
      zenith: 0x5a9cb4,
      horizon: 0xd5e5d6,
      hemiSky: 0xd8ecdc,
      far: 0x2b6f63,
    },
    ambient: 'mist',
  },
  // Snow on the meadows, pines on the shore, ice in the ponds.
  frost: {
    ...TROPICAL,
    ground: {
      seabedDeep: 0x173f55,
      seabed: 0x9a958c,
      wetSand: 0xa29a8e,
      sand: 0xd2cec6,
      drySand: 0xeef2f4,
      grass: 0xe9eff3,
      grassDark: 0xd2dde5,
      grassLight: 0xf8fbfc,
      jungleFloor: 0x3d5a49,
      rock: 0x7b838e,
      rockDark: 0x58606a,
      pondBed: 0xa9d0de,
    },
    treeTrunk: 0x4e3a2a,
    treeLeaves: [0x2c5a45, 0x356550, 0x264f3c],
    tree: 'pine',
    tuft: [0xa9a57b, 0xc4bf91],
    bush: 0x3c5e4c,
    flowers: [0xb8323f, 0xf4f7f9],
    cliff: [0x9aa1aa, 0x878f99],
    palms: 0,
    sea: { deep: 0x0c3953, mid: 0x29698a, shallow: 0x8acbd8 },
    sky: {
      zenith: 0x7ea7c8,
      horizon: 0xe7eff3,
      hemiSky: 0xeef5fa,
      far: 0x2f6a86,
    },
    ambient: 'snow',
  },
  // White sand, a bright lagoon and a reef in the shallows.
  coral: {
    ...TROPICAL,
    ground: {
      ...TROPICAL.ground,
      seabedDeep: 0x17708c,
      seabed: 0xeedcb0,
      wetSand: 0xe8d8b2,
      sand: 0xfbf1da,
      drySand: 0xfff9ec,
      grass: 0x78cc58,
      grassLight: 0x9ade6c,
    },
    sea: { deep: 0x0a5b8c, mid: 0x12a8ba, shallow: 0x7aefdf },
    sky: {
      zenith: 0x2f9ae0,
      horizon: 0xd9f4f6,
      hemiSky: 0xd3f1fb,
      far: 0x1e93ad,
    },
    ambient: 'reef',
    birds: 6,
  },
};
