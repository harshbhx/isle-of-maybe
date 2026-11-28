// The 3D island (UI-3.1, UI-3.6, UI-5.1): a chunky low-poly world in three.js under a tropical sky.
// Terrain columns per tile, a faceted sea over a shallow lagoon floor, landmark models, the sailor,
// footprints, holes, route dots, reveal markers and low cloud over unseen land. Loaded lazily by
// IslandCanvas, which falls back to the 2D renderer if anything here fails (UI-3.5).
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Line,
  LineDashedMaterial,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Plane,
  Raycaster,
  Scene as ThreeScene,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';
import type { LandmarkType } from '../../../shared/types.ts';
import { H, W, type Island, type Tile } from '../../../shared/types.ts';
import {
  landmarkVisible,
  tileKind,
  tilesAcross,
  toTile,
  toWorld,
} from '../../../shared/relief.ts';
import type { Scene } from '../draw.ts';
import { createFlora, type Wind } from './world/flora.ts';
import { SEA_LEVELS, buildHeights, type Heights } from './world/heights.ts';
import { createBirds } from './world/life.ts';
import { createMist, type Mist } from './world/mist.ts';
import { createExplorer, type HatTier, type Pose } from './world/explorer.ts';
import { createSign } from './world/sign.ts';
import { createGhosts, type Ghosts } from './world/ghosts.ts';
import type { GhostMessage } from '../../../shared/ghost.ts';
import { createQuicksand } from './world/quicksand.ts';
import {
  createCinematic,
  type Cinematic,
  type Stamp,
} from './world/cinematic.ts';
import { createSea, type Sea } from './world/sea.ts';
import { createSky, skyLook } from './world/sky.ts';
import { buildTerrainGeometry } from './world/terrain.ts';
import { createWeather, type Weather } from './world/weather.ts';
import { BIOME_LOOKS } from './world/biome.ts';
import { biomeFor } from '../../../shared/biome.ts';

export type Island3D = {
  update: (
    scene: Omit<Scene, 'now'>,
    zoom: number,
    focus: { x: number; y: number } | null
  ) => void;
  tileAt: (px: number, py: number) => Tile | null;
  /** Sea level as a fractional tide level 0–3 (ADV-4.2). */
  setTide: (level: number) => void;
  /** Free movement (ADV-3): the renderer moves the explorer and reports each tile step. */
  drive: (d: Drive | null) => void;
  /** Stick or keys: x right, y down the screen, length 0–1; `run` forces running. */
  input: (x: number, y: number, run: boolean) => void;
  /** Travel to a tapped tile along a walkable path. */
  goTo: (t: Tile) => void;
  /** Hold a pose (dig, celebrate, dejected); null hands it back to movement. */
  pose: (p: Pose | null) => void;
  /** The explorer's position in tile units, while driving. */
  position: () => { x: number; y: number } | null;
  /** Another hunter, right now (ADV-6.7). */
  ghost: (m: GhostMessage) => void;
  /** Show or hide the ghosts (ADV-6.7). */
  showGhosts: (v: boolean) => void;
  /** Today's crowd wear, 0–3 per tile: trodden paths on the island (ADV-6.5). */
  setWear: (levels: Uint8Array) => void;
  /** The explorer's hat shows the player's flair tier (ADV-6.1). */
  setHat: (tier: HatTier) => void;
  /** The carved sign by the dock: the island's name and who named it (ADV-6.3). */
  setSign: (title: string, by: string | null, font: string) => void;
  /** The end of a hunt on screen (ADV-5): resolves when it has played. */
  cinematic: (c: {
    kind: 'found' | 'missed' | 'tide';
    chest: Tile;
    label: string;
    stamp: Stamp;
    font: string;
  }) => Promise<void>;
  dispose: () => void;
};

export type Quality = 'high' | 'low';

export type Ground = 'open' | 'thicket' | 'quicksand';
export type Drive = {
  start: Tile;
  /** Impassable now: not walkable, or under the tide. */
  blocked: (x: number, y: number) => boolean;
  ground: (x: number, y: number) => Ground;
  onStep: (t: Tile) => void;
};

/** Tiles per second (ADV-3.1). Running diagonally still stays under the server's 5 steps/s. */
const WALK = 2.2;
const RUN = 3.4;
const RADIUS = 0.22;
const TRAP_S = 2.5;

/** High on a desktop-class device, lighter on phones (ADV-4.3). */
export const qualityTier = (): Quality => {
  const fine = window.matchMedia?.('(pointer: fine)').matches ?? false;
  const cores = navigator.hardwareConcurrency ?? 4;
  return fine && cores >= 4 ? 'high' : 'low';
};

const seaLevelFor = (tide: number): number => {
  // Past level 3 is the tide's final surge at the end of a hunt (ADV-5.3).
  if (tide > 3) return (SEA_LEVELS[3] ?? 0.375) + (tide - 3) * 0.18;
  const lo = Math.max(0, Math.min(3, Math.floor(tide)));
  const hi = Math.min(3, lo + 1);
  const f = Math.max(0, Math.min(1, tide - lo));
  const a = SEA_LEVELS[lo] ?? 0.12;
  const b = SEA_LEVELS[hi] ?? a;
  return a + (b - a) * f;
};

// Tropical day (docs/03-DESIGN.md §3).
const COL = {
  sea: 0x1e9a9c,
  deep: 0x0a6468,
  shallows: 0x4cc3b9,
  sand: 0xf2d99b,
  sandSide: 0xd9b872,
  grass: 0x6dbe5a,
  grass2: 0x5faf4e,
  grassSide: 0x8a6a44,
  jungle: 0x2e7d3a,
  jungleSide: 0x245f2d,
  rock: 0x8a8178,
  rockSide: 0x6f675f,
  pond: 0x6fd3e0,
  ink: 0x2b1d12,
  hibiscus: 0xb8233f,
  mango: 0xffb21e,
  foam: 0xfff7e8,
  cloud: 0xf4fbf8,
  wood: 0x8a5a2b,
  plank: 0x9a7448,
  stone: 0x9b9186,
  palm: 0x2e7d3a,
  palmLight: 0x4f9e3f,
  straw: 0xe2c26b,
  coat: 0x2f4a6b,
  skin: 0xf1c9a0,
  sky: 0xfff3d6,
};

/** A footprint is two small prints, left and right. */
const PRINTS: readonly (readonly [number, number])[] = [
  [-0.08, 0.04],
  [0.08, -0.04],
];

const lambert = (
  color: number,
  extra: {
    emissive?: number;
    transparent?: boolean;
    opacity?: number;
    flat?: boolean;
  } = {}
): MeshLambertMaterial =>
  new MeshLambertMaterial({
    color,
    emissive: extra.emissive ?? 0x000000,
    transparent: extra.transparent ?? false,
    opacity: extra.opacity ?? 1,
    flatShading: extra.flat ?? true,
  });

const palm = (scale = 1, lean = 0.12): Group => {
  const g = new Group();
  const trunk = new Mesh(
    new CylinderGeometry(0.05, 0.08, 0.95, 6),
    lambert(COL.wood)
  );
  trunk.position.y = 0.47;
  trunk.rotation.z = lean;
  g.add(trunk);
  const crown = new Group();
  crown.position.set(-lean * 0.9, 0.95, 0);
  for (let i = 0; i < 6; i++) {
    const leaf = new Mesh(
      new BoxGeometry(0.55, 0.035, 0.16),
      lambert(i % 2 ? COL.palm : COL.palmLight)
    );
    leaf.position.set(
      Math.cos((i / 6) * Math.PI * 2) * 0.24,
      -0.06,
      Math.sin((i / 6) * Math.PI * 2) * 0.24
    );
    leaf.rotation.y = -(i / 6) * Math.PI * 2;
    leaf.rotation.z = -0.45;
    crown.add(leaf);
  }
  const nut = new Mesh(new SphereGeometry(0.06, 6, 4), lambert(0x6b4a2a));
  nut.position.set(0.05, -0.1, 0.04);
  crown.add(nut);
  g.add(crown);
  g.scale.setScalar(scale);
  return g;
};

/** The ten landmarks as small models with the same silhouettes as their glyphs. */
const landmarkModel = (type: LandmarkType): Group => {
  const g = new Group();
  const add = (m: Mesh, x = 0, y = 0, z = 0): Mesh => {
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  switch (type) {
    case 'palm':
      g.add(palm());
      break;
    case 'twinPalms': {
      const a = palm(0.9, 0.18);
      a.position.x = -0.18;
      const b = palm(0.8, -0.16);
      b.position.set(0.2, 0, 0.1);
      g.add(a, b);
      break;
    }
    case 'boulder': {
      const m = add(
        new Mesh(new IcosahedronGeometry(0.4, 0), lambert(COL.rock)),
        0,
        0.26
      );
      m.scale.set(1.1, 0.75, 1);
      break;
    }
    case 'skullRock': {
      add(
        new Mesh(new DodecahedronGeometry(0.42, 0), lambert(0xded6c6)),
        0,
        0.36
      );
      add(
        new Mesh(new SphereGeometry(0.09, 6, 4), lambert(COL.ink)),
        -0.14,
        0.42,
        0.34
      );
      add(
        new Mesh(new SphereGeometry(0.09, 6, 4), lambert(COL.ink)),
        0.14,
        0.42,
        0.34
      );
      add(
        new Mesh(new BoxGeometry(0.2, 0.06, 0.06), lambert(COL.ink)),
        0,
        0.22,
        0.38
      );
      break;
    }
    case 'hut': {
      add(
        new Mesh(new BoxGeometry(0.6, 0.38, 0.52), lambert(0xc8a06a)),
        0,
        0.19
      );
      const roof = add(
        new Mesh(new ConeGeometry(0.52, 0.42, 4), lambert(COL.straw)),
        0,
        0.58
      );
      roof.rotation.y = Math.PI / 4;
      add(
        new Mesh(new BoxGeometry(0.16, 0.24, 0.02), lambert(COL.ink)),
        0,
        0.12,
        0.27
      );
      break;
    }
    case 'wreck': {
      const hull = add(
        new Mesh(new BoxGeometry(0.85, 0.24, 0.34), lambert(COL.wood)),
        0,
        0.14
      );
      hull.rotation.set(0.12, 0.4, 0.18);
      const mast = add(
        new Mesh(new CylinderGeometry(0.03, 0.03, 0.6, 5), lambert(0x6b4a2a)),
        0.05,
        0.42
      );
      mast.rotation.z = -0.5;
      const sail = add(
        new Mesh(new BoxGeometry(0.02, 0.3, 0.26), lambert(COL.foam)),
        0.2,
        0.52
      );
      sail.rotation.z = -0.5;
      break;
    }
    case 'well': {
      add(
        new Mesh(
          new CylinderGeometry(0.26, 0.28, 0.26, 10),
          lambert(COL.stone)
        ),
        0,
        0.13
      );
      add(
        new Mesh(new CircleGeometry(0.2, 10), lambert(0x1a3a40)),
        0,
        0.265
      ).rotation.x = -Math.PI / 2;
      add(
        new Mesh(new BoxGeometry(0.04, 0.5, 0.04), lambert(COL.wood)),
        -0.22,
        0.4
      );
      add(
        new Mesh(new BoxGeometry(0.04, 0.5, 0.04), lambert(COL.wood)),
        0.22,
        0.4
      );
      const roof = add(
        new Mesh(new ConeGeometry(0.34, 0.2, 4), lambert(COL.hibiscus)),
        0,
        0.72
      );
      roof.rotation.y = Math.PI / 4;
      break;
    }
    case 'statue': {
      add(
        new Mesh(new BoxGeometry(0.44, 0.14, 0.44), lambert(COL.stone)),
        0,
        0.07
      );
      add(
        new Mesh(new BoxGeometry(0.26, 0.5, 0.22), lambert(COL.stone)),
        0,
        0.39
      );
      add(
        new Mesh(new BoxGeometry(0.24, 0.26, 0.24), lambert(0xa79d91)),
        0,
        0.77
      );
      add(
        new Mesh(new BoxGeometry(0.2, 0.05, 0.04), lambert(COL.ink)),
        0,
        0.8,
        0.13
      );
      break;
    }
    case 'campfire': {
      const l1 = add(
        new Mesh(new CylinderGeometry(0.04, 0.04, 0.5, 5), lambert(COL.wood)),
        0,
        0.05
      );
      l1.rotation.set(Math.PI / 2, 0, 0.6);
      const l2 = add(
        new Mesh(new CylinderGeometry(0.04, 0.04, 0.5, 5), lambert(COL.wood)),
        0,
        0.05
      );
      l2.rotation.set(Math.PI / 2, 0, -0.6);
      add(
        new Mesh(
          new ConeGeometry(0.16, 0.42, 5),
          lambert(0xff7a1e, { emissive: 0xc24a00 })
        ),
        0,
        0.26
      ).name = 'flame';
      add(
        new Mesh(
          new ConeGeometry(0.08, 0.26, 5),
          lambert(0xffd24a, { emissive: 0xd99a00 })
        ),
        0.04,
        0.22,
        0.04
      ).name = 'flame';
      break;
    }
    case 'cave': {
      const hill = add(
        new Mesh(
          new SphereGeometry(0.5, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
          lambert(0x7d756c)
        ),
        0,
        0
      );
      hill.scale.set(1, 0.9, 0.9);
      add(
        new Mesh(new CircleGeometry(0.2, 10, 0, Math.PI), lambert(0x1f1610)),
        0,
        0.02,
        0.43
      );
      break;
    }
  }
  g.traverse((o) => {
    o.castShadow = true;
  });
  return g;
};

const chestModel = (open: boolean, ghost: boolean): Group => {
  const g = new Group();
  const m = (c: number): MeshLambertMaterial =>
    lambert(c, ghost ? { transparent: true, opacity: 0.55 } : {});
  const base = new Mesh(new BoxGeometry(0.46, 0.26, 0.32), m(COL.wood));
  base.position.y = 0.13;
  const band = new Mesh(new BoxGeometry(0.48, 0.05, 0.34), m(COL.mango));
  band.position.y = 0.2;
  const lid = new Group();
  const lidMesh = new Mesh(new BoxGeometry(0.46, 0.1, 0.32), m(COL.wood));
  lidMesh.position.z = 0.16;
  lid.add(lidMesh);
  lid.position.set(0, 0.28, -0.16);
  if (open) {
    lid.rotation.x = -1.1;
    const gold = new Mesh(
      new SphereGeometry(0.15, 8, 6),
      lambert(COL.mango, { emissive: 0xb86f00 })
    );
    gold.position.y = 0.28;
    gold.scale.set(1.2, 0.5, 0.8);
    g.add(gold);
  }
  g.add(base, band, lid);
  g.traverse((o) => {
    o.castShadow = !ghost;
  });
  return g;
};

const xModel = (): Group => {
  const g = new Group();
  for (const r of [Math.PI / 4, -Math.PI / 4]) {
    const bar = new Mesh(
      new BoxGeometry(0.85, 0.06, 0.15),
      lambert(COL.hibiscus)
    );
    bar.rotation.y = r;
    bar.position.y = 0.04;
    g.add(bar);
  }
  return g;
};

const dispose = (o: Object3D): void => {
  o.traverse((n) => {
    if (n instanceof Mesh || n instanceof Line || n instanceof InstancedMesh) {
      n.geometry.dispose();
      const mats: Material[] = Array.isArray(n.material)
        ? n.material
        : [n.material];
      for (const m of mats) m.dispose();
    }
  });
};

export const createIsland3D = (
  canvas: HTMLCanvasElement,
  opts: {
    reducedMotion: boolean;
    onFail: () => void;
    /** Adaptive quality (ADV-7.1); off only for offline renders such as key art. */
    adaptive?: boolean;
  }
): Island3D => {
  const quality = qualityTier();
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1.5)
  );
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    opts.onFail();
  });

  const scene = new ThreeScene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 700);
  const hemi = new HemisphereLight(COL.sky, COL.sea, 1.15);
  scene.add(hemi);
  scene.add(new AmbientLight(0xffffff, 0.18));
  const sun = new DirectionalLight(0xfff1d0, 2.4);
  sun.position.set(-14, 26, 10);
  sun.castShadow = true;
  const shadowSize = quality === 'high' ? 2048 : 1024;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);
  const wind: Wind = { value: 0 };
  const sunDir = new Vector3(-0.55, 0.72, 0.42).normalize();
  let sea: Sea | null = null;
  let tide = 0;
  let sky: { group: Group; tick: (t: number) => void } | null = null;
  let birds: { group: Group; tick: (t: number) => void } | null = null;
  let weather: Weather | null = null;
  // Adaptive quality (ADV-7.1): measured frame time steps the world down, never back up.
  let level = 0;
  let floraMeshes: InstancedMesh[] = [];
  const frames: number[] = [];
  let watchFrom = 0;
  const applyLevel = (): void => {
    canvas.dataset.quality = String(level);
    if (level >= 1 && renderer.shadowMap.enabled) {
      renderer.shadowMap.enabled = false;
      sun.castShadow = false;
      // Materials compiled with shadows must recompile without them.
      scene.traverse((o) => {
        if (o instanceof Mesh || o instanceof InstancedMesh) {
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => (x.needsUpdate = true));
          else m.needsUpdate = true;
        }
      });
    }
    if (level >= 2) {
      for (const m of floraMeshes)
        m.count = Math.ceil(m.instanceMatrix.count / 2);
      if (birds !== null) birds.group.visible = false;
      if (weather !== null) weather.group.visible = false;
    }
    if (level >= 3) renderer.setPixelRatio(1);
  };
  const watchFrames = (t: number, dt: number): void => {
    if (opts.adaptive === false || level >= 3 || dt <= 0) return;
    if (watchFrom === 0) watchFrom = t + 2; // let the first frames (shader compiles) pass
    if (t < watchFrom) return;
    frames.push(dt);
    const total = frames.reduce((a, b) => a + b, 0);
    if (total < 3) return;
    const fps = frames.length / total;
    frames.length = 0;
    if (fps < 40) {
      level += 1;
      applyLevel();
      // Give the new level a moment before judging it.
      watchFrom = t + 1;
    }
  };
  let heights: Heights | null = null;
  let quicksandTick: (t: number) => void = () => undefined;
  // Quicksand shows where a screen passes the hunt's hazards (the hunt does; Practice Cove doesn't).
  let lastQs: ReadonlySet<number> | null = null;
  let qsMesh: Object3D | null = null;
  let signObj: Group | null = null;
  let baseColors: Float32Array | null = null;
  let ghosts: Ghosts | null = null;
  let ghostsOn = true;
  const dirt = new Color(0x9e7b50);
  const env = new Group();
  scene.add(env);

  const world = new Group();
  scene.add(world);
  const dynamic = new Group();
  scene.add(dynamic);
  const explorer = createExplorer();
  const sailor = explorer.root;
  sailor.scale.setScalar(0.95);
  sailor.visible = false;
  scene.add(sailor);
  // Free movement state (ADV-3).
  let drv: Drive | null = null;
  const pos = { x: 0, y: 0 };
  let tileNow: Tile = { x: 0, y: 0 };
  const stick = { x: 0, y: 0, run: false };
  let path: Tile[] = [];
  let trapped = 0;
  let held: Pose | null = null;
  let heading = 0;
  let lastT = 0;
  let zoomNow = 1;
  let yaw = 0;
  let cin: {
    c: Cinematic;
    start: number;
    kind: 'found' | 'missed' | 'tide';
    at: Vector3;
    done: () => void;
  } | null = null;

  const footGeo = new CircleGeometry(0.05, 6);
  footGeo.rotateX(-Math.PI / 2);
  const feet = new InstancedMesh(
    footGeo,
    lambert(0x6b4a2a, { transparent: true, opacity: 0.55 }),
    260
  );
  feet.count = 0;
  scene.add(feet);
  const dotGeo = new SphereGeometry(0.075, 8, 6);
  const dots = new InstancedMesh(
    dotGeo,
    lambert(COL.foam, { emissive: 0x6b6355 }),
    200
  );
  dots.count = 0;
  scene.add(dots);
  const dimGeo = new PlaneGeometry(1, 1);
  dimGeo.rotateX(-Math.PI / 2);
  const dims = new InstancedMesh(
    dimGeo,
    lambert(COL.cloud, { transparent: true, opacity: 0.5 }),
    W * H
  );
  dims.count = 0;
  scene.add(dims);
  const ring = new Mesh(
    new TorusGeometry(0.34, 0.045, 6, 20),
    lambert(COL.mango, { emissive: 0x8a5a00 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  let island: Island | null = null;
  let terrain: Mesh | null = null;
  let mist: Mist | null = null;
  let lastSeen: Uint8Array | null | undefined;
  let landmarks: { type: LandmarkType; at: Tile; obj: Group }[] = [];
  let markerKey = '';
  let holesKey = '';
  let link: Line | null = null;
  const holeGroup = new Group();
  scene.add(holeGroup);
  const markerGroup = new Group();
  scene.add(markerGroup);

  const m4 = new Matrix4();
  const target = new Vector3(0, 0, 0);
  let distance = 40;
  let wantTarget = new Vector3(0, 0, 0);
  let wantDistance = 40;
  let snapped = false;
  let current: Omit<Scene, 'now'> | null = null;
  const seaY = (): number => sea?.level() ?? SEA_LEVELS[0] ?? 0.12;
  const topAt = (x: number, y: number): number => {
    if (island === null || heights === null) return 0;
    const w = toWorld({ x, y });
    return Math.max(
      heights.at(w.x, w.z),
      tileKind(island, x, y) === 'water' ? seaY() : -9
    );
  };

  const build = (next: Island): void => {
    dispose(world);
    world.clear();
    dispose(env);
    env.clear();
    island = next;
    const h = buildHeights(next);
    heights = h;
    // The day's biome dresses everything below (ADV-10.2).
    const biome = BIOME_LOOKS[biomeFor(next.seed)];
    // Sky, light and haze (Lantern night is a warm dusk).
    const look = skyLook(next.modifier === 'lanterns', biome.sky);
    scene.fog = new Fog(look.horizon, 55, 190);
    scene.background = look.horizon;
    hemi.color.copy(look.hemiSky);
    hemi.groundColor.copy(look.hemiGround);
    sun.color.copy(look.sun);
    sun.intensity = look.sunPower;
    sun.position.copy(look.sunDir).multiplyScalar(40);
    sunDir.copy(look.sunDir);
    sky = createSky(look, next.seed, quality === 'high' ? 7 : 3);
    env.add(sky.group);
    sea = createSea(h, {
      size: 96,
      segments: quality === 'high' ? 192 : 110,
      calm: opts.reducedMotion,
      sunDir: look.sunDir,
      colors: biome.sea,
    });
    sea.setFog(look.horizon, 55, 190);
    sea.setLevel(seaLevelFor(tide));
    env.add(sea.mesh);
    birds =
      quality === 'high' || !opts.reducedMotion
        ? createBirds(next.seed, (quality === 'high' ? 9 : 5) + biome.birds)
        : null;
    if (birds !== null && !opts.reducedMotion) env.add(birds.group);
    weather?.dispose();
    weather = opts.reducedMotion
      ? null
      : createWeather(biome.ambient, next.seed, h, quality === 'high');
    if (weather !== null) env.add(weather.group);

    terrain = new Mesh(
      buildTerrainGeometry(next, h, biome.ground),
      new MeshLambertMaterial({ vertexColors: true })
    );
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    world.add(terrain);
    baseColors = Float32Array.from(
      terrain.geometry.getAttribute('color').array
    );
    // Dock: a short jetty of planks on posts.
    const dw = toWorld(next.dock);
    const deck = Math.max(h.at(dw.x, dw.z), 0.3) + 0.08;
    for (let i = 0; i < 6; i++) {
      const plank = new Mesh(
        new BoxGeometry(0.9, 0.06, 0.2),
        lambert(i % 2 === 0 ? COL.plank : 0x8a6a40)
      );
      plank.position.set(dw.x, deck, dw.z + 0.1 + i * 0.24);
      plank.castShadow = true;
      plank.receiveShadow = true;
      world.add(plank);
    }
    for (const sx of [-0.4, 0.4])
      for (const sz of [0.6, 1.3]) {
        const post = new Mesh(
          new CylinderGeometry(0.05, 0.06, 1.2, 6),
          lambert(0x6a4a2c)
        );
        post.position.set(dw.x + sx, deck - 0.5, dw.z + sz);
        world.add(post);
      }
    const flora = createFlora(
      next,
      h,
      wind,
      quality === 'high' ? 1 : 0.45,
      biome
    );
    for (const m of flora.meshes) world.add(m);
    floraMeshes = flora.meshes;
    applyLevel();
    lastQs = null;

    landmarks = next.landmarks.map((l) => {
      const obj = landmarkModel(l.type);
      obj.scale.setScalar(1.45);
      const w = toWorld(l.at);
      obj.position.set(w.x, h.at(w.x, w.z) - 0.02, w.z);
      obj.rotation.y = ((l.at.x * 31 + l.at.y * 17) % 8) * 0.25 - 1;
      world.add(obj);
      return { type: l.type, at: l.at, obj };
    });
    mist = createMist(next, quality === 'high' ? 3 : 2);
    world.add(mist.group);
    lastSeen = undefined;
    markerKey = '';
    holesKey = '';
  };

  const refreshClouds = (seen: Uint8Array | null): void => {
    mist?.setSeen(seen);
  };

  const refreshHoles = (holes: readonly Tile[]): void => {
    const key = holes.map((h) => `${h.x},${h.y}`).join(';');
    if (key === holesKey) return;
    holesKey = key;
    dispose(holeGroup);
    holeGroup.clear();
    for (const h of holes) {
      const w = toWorld(h);
      const top = topAt(h.x, h.y);
      const pit = new Mesh(new CircleGeometry(0.24, 10), lambert(0x3a2a1a));
      pit.rotation.x = -Math.PI / 2;
      pit.position.set(w.x, top + 0.012, w.z);
      const mound = new Mesh(
        new SphereGeometry(0.14, 6, 4),
        lambert(COL.sandSide)
      );
      mound.scale.set(1.2, 0.45, 1);
      mound.position.set(w.x + 0.28, top + 0.03, w.z + 0.12);
      holeGroup.add(pit, mound);
    }
  };

  const refreshMarkers = (s: Omit<Scene, 'now'>): void => {
    const key =
      s.markers.map((m) => `${m.kind}:${m.at.x},${m.at.y}`).join(';') +
      (s.link ? '|L' : '');
    if (key === markerKey) return;
    markerKey = key;
    dispose(markerGroup);
    markerGroup.clear();
    link = null;
    for (const m of s.markers) {
      const w = toWorld(m.at);
      const top = topAt(m.at.x, m.at.y);
      const obj =
        m.kind === 'x'
          ? xModel()
          : chestModel(m.kind === 'chestOpen', m.kind === 'preview');
      obj.position.set(w.x, top, w.z);
      markerGroup.add(obj);
    }
    const x = s.markers.find((m) => m.kind === 'x');
    const chest = s.markers.find(
      (m) => m.kind === 'chest' || m.kind === 'chestOpen'
    );
    if (s.link && x !== undefined && chest !== undefined) {
      const a = toWorld(x.at);
      const b = toWorld(chest.at);
      const g = new BufferGeometry().setFromPoints([
        new Vector3(a.x, topAt(x.at.x, x.at.y) + 0.12, a.z),
        new Vector3(b.x, topAt(chest.at.x, chest.at.y) + 0.12, b.z),
      ]);
      link = new Line(
        g,
        new LineDashedMaterial({
          color: COL.ink,
          dashSize: 0.22,
          gapSize: 0.16,
        })
      );
      link.computeLineDistances();
      markerGroup.add(link);
    }
  };

  const update: Island3D['update'] = (s, zoom, focus) => {
    current = s;
    if (
      island === null ||
      island.seed !== s.island.seed ||
      island.modifier !== s.island.modifier
    )
      build(s.island);
    if (s.seen !== lastSeen) {
      refreshClouds(s.seen);
      lastSeen = s.seen;
    }
    for (const l of landmarks)
      l.obj.visible =
        landmarkVisible(s.island, s.seen, s.sailor, l.at) !== 'hidden';
    const qs = s.hazards?.quicksand ?? null;
    if (qs !== lastQs && heights !== null) {
      lastQs = qs;
      if (qsMesh !== null) {
        world.remove(qsMesh);
        dispose(qsMesh);
        qsMesh = null;
      }
      if (qs !== null) {
        const made = createQuicksand(qs, heights);
        quicksandTick = made.tick;
        qsMesh = made.mesh;
        if (qsMesh !== null) world.add(qsMesh);
      }
    }
    refreshHoles(s.holes);
    refreshMarkers(s);
    // Seen from high above (reveal), markers grow so the X and the chest read at a glance.
    for (const c of markerGroup.children)
      if (!(c instanceof Line)) c.scale.setScalar(zoom <= 0 ? 2.4 : 1);

    // Footprints (two small prints each) and route dots.
    let n = 0;
    for (const f of s.footprints) {
      if (n >= 258) break;
      const w = toWorld(f);
      const top = topAt(Math.round(f.x), Math.round(f.y)) + 0.012;
      for (const [ox, oz] of PRINTS) {
        m4.makeTranslation(w.x + ox, top, w.z + oz);
        feet.setMatrixAt(n++, m4);
      }
    }
    feet.count = n;
    feet.instanceMatrix.needsUpdate = true;
    let d = 0;
    for (const t of s.route.slice(1)) {
      if (d >= 200) break;
      const w = toWorld(t);
      m4.makeTranslation(w.x, topAt(t.x, t.y) + 0.1, w.z);
      dots.setMatrixAt(d++, m4);
    }
    dots.count = d;
    dots.instanceMatrix.needsUpdate = true;
    const end = s.route[s.route.length - 1];
    ring.visible = s.route.length > 1 && end !== undefined;
    if (end !== undefined) {
      const w = toWorld(end);
      ring.position.set(w.x, topAt(end.x, end.y) + 0.05, w.z);
    }

    // Bury: dim the seen tiles you may not choose.
    let k = 0;
    if (s.highlight !== null) {
      for (let i = 0; i < W * H; i++) {
        if (((s.highlight[i >> 3] ?? 0) >> (i & 7)) & 1) continue;
        if (s.seen !== null && !(((s.seen[i >> 3] ?? 0) >> (i & 7)) & 1))
          continue;
        const x = i % W;
        const y = Math.floor(i / W);
        if (tileKind(s.island, x, y) === 'water') continue;
        const w = toWorld({ x, y });
        m4.makeTranslation(w.x, topAt(x, y) + 0.02, w.z);
        dims.setMatrixAt(k++, m4);
      }
    }
    dims.count = k;
    dims.instanceMatrix.needsUpdate = true;

    // Camera: frame N tiles across the short side, following the focus (or the whole island).
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const across = tilesAcross(zoom);
    const half = Math.tan(((camera.fov / 2) * Math.PI) / 180);
    // Portrait phones sit a little closer: the sailor and the next few tiles matter most there.
    wantDistance =
      aspect < 1
        ? (across * 0.8) / (2 * half * aspect)
        : (across * 0.78) / (2 * half);
    if (zoom > 0 && focus !== null) {
      const w = toWorld(focus);
      wantTarget = new Vector3(
        Math.max(-16, Math.min(16, w.x)),
        0.5,
        Math.max(-16, Math.min(16, w.z))
      );
    } else wantTarget = new Vector3(0, 0.4, 0.5);
    tilt = zoom <= 0 ? tiltWide : tiltClose;
    zoomNow = zoom;
    if (drv !== null) {
      // Follow camera: close and a little lower, so the island feels big around you.
      wantDistance = (aspect < 1 ? 11.5 : 9.5) / Math.max(0.6, zoom);
      tilt = (46 * Math.PI) / 180;
      const w = toWorld(pos);
      wantTarget = new Vector3(w.x, 0.6, w.z);
    }
    if (!snapped || opts.reducedMotion) {
      target.copy(wantTarget);
      distance = wantDistance;
      snapped = true;
    }
  };

  // --- Free movement (ADV-3.1 – ADV-3.3) ---
  let curPose: Pose = 'idle';
  let curSpeed = 0;
  const tileOf = (p: { x: number; y: number }): Tile => ({
    x: Math.round(p.x),
    y: Math.round(p.y),
  });
  /** Would a circle at (x, y) overlap any blocked tile? */
  const hits = (x: number, y: number): boolean => {
    if (drv === null) return false;
    for (let ty = Math.round(y - RADIUS); ty <= Math.round(y + RADIUS); ty++)
      for (
        let tx = Math.round(x - RADIUS);
        tx <= Math.round(x + RADIUS);
        tx++
      ) {
        if (!drv.blocked(tx, ty)) continue;
        // Closest point of the tile square to the circle centre.
        const cx = Math.max(tx - 0.5, Math.min(x, tx + 0.5));
        const cy = Math.max(ty - 0.5, Math.min(y, ty + 0.5));
        if ((cx - x) ** 2 + (cy - y) ** 2 < RADIUS * RADIUS) return true;
      }
    return false;
  };
  /** Shortest 4-directional path through tiles that aren't blocked (BFS; the island is small). */
  const route = (from: Tile, to: (t: Tile) => boolean): Tile[] => {
    if (drv === null) return [];
    const key = (t: Tile): number => t.y * W + t.x;
    const prev = new Map<number, number>([[key(from), -1]]);
    const queue: Tile[] = [from];
    for (let q = 0; q < queue.length && q < W * H; q++) {
      const c = queue[q];
      if (c === undefined) break;
      if (q > 0 && to(c)) {
        const out: Tile[] = [];
        let k = key(c);
        while (k !== key(from) && k >= 0) {
          out.unshift({ x: k % W, y: Math.floor(k / W) });
          k = prev.get(k) ?? -1;
        }
        return out;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const n = { x: c.x + dx, y: c.y + dy };
        if (n.x < 0 || n.y < 0 || n.x >= W || n.y >= H) continue;
        if (prev.has(key(n)) || drv.blocked(n.x, n.y)) continue;
        prev.set(key(n), key(c));
        queue.push(n);
      }
    }
    return [];
  };
  /** Report the tile change as 4-directional steps (a diagonal goes through an open neighbour). */
  const stepTo = (next: Tile): void => {
    if (drv === null) return;
    const a = tileNow;
    if (a.x === next.x && a.y === next.y) return;
    const d = Math.abs(a.x - next.x) + Math.abs(a.y - next.y);
    let steps: Tile[];
    if (d === 1) steps = [next];
    else if (d === 2 && a.x !== next.x && a.y !== next.y) {
      const m1 = { x: next.x, y: a.y };
      const m2 = { x: a.x, y: next.y };
      steps = !drv.blocked(m1.x, m1.y)
        ? [m1, next]
        : !drv.blocked(m2.x, m2.y)
          ? [m2, next]
          : [];
    } else steps = route(a, (t) => t.x === next.x && t.y === next.y);
    if (steps.length === 0) {
      // Can't legally get there: stay on the old tile.
      pos.x = a.x;
      pos.y = a.y;
      return;
    }
    for (const st of steps) drv.onStep(st);
    tileNow = next;
    if (drv.ground(next.x, next.y) === 'quicksand') trapped = TRAP_S;
  };
  const move = (dt: number): void => {
    if (drv === null || dt <= 0) return;
    const here = tileOf(pos);
    // The tide reached you: wade back up the beach.
    if (drv.blocked(here.x, here.y) && path.length === 0)
      path = route(here, (t) => !(drv?.blocked(t.x, t.y) ?? true));
    if (held !== null) {
      curPose = held;
      curSpeed = 0;
      return;
    }
    if (trapped > 0) {
      trapped -= dt;
      curPose = 'stuck';
      curSpeed = 0;
      return;
    }
    let vx = stick.x;
    let vy = stick.y;
    let mag = Math.hypot(vx, vy);
    if (mag > 0.05) path = [];
    else if (path.length > 0) {
      const goal = path[0];
      if (goal !== undefined) {
        vx = goal.x - pos.x;
        vy = goal.y - pos.y;
        const dist = Math.hypot(vx, vy);
        if (dist < 0.08) {
          path.shift();
          vx = 0;
          vy = 0;
        } else {
          vx /= dist;
          vy /= dist;
        }
        mag = path.length > 6 ? 1 : 0.6;
      }
    }
    mag = Math.min(1, mag);
    if (mag < 0.05) {
      curPose = 'idle';
      curSpeed = 0;
      return;
    }
    const running = stick.run || mag > 0.75 || path.length > 6;
    const g = drv.ground(here.x, here.y);
    const speed = (running ? RUN : WALK) * (g === 'open' ? 1 : 0.5);
    const len = Math.hypot(vx, vy) || 1;
    const sx = (vx / len) * speed * dt * Math.max(mag, 0.35);
    const sy = (vy / len) * speed * dt * Math.max(mag, 0.35);
    // Slide along walls: try each axis on its own.
    if (!hits(pos.x + sx, pos.y)) pos.x += sx;
    if (!hits(pos.x, pos.y + sy)) pos.y += sy;
    heading = Math.atan2(vx, vy);
    curPose = running ? 'run' : 'walk';
    curSpeed = speed;
    stepTo(tileOf(pos));
  };

  const ray = new Raycaster();
  const ground = new Plane(new Vector3(0, 1, 0), -0.4);
  const tileAt: Island3D['tileAt'] = (px, py) => {
    const ndc = new Vector2(
      (px / canvas.clientWidth) * 2 - 1,
      -(py / canvas.clientHeight) * 2 + 1
    );
    ray.setFromCamera(ndc, camera);
    if (terrain !== null) {
      const hit = ray.intersectObject(terrain, false)[0];
      if (hit !== undefined) {
        // Nudge into the face we hit, so a tap on a column's side picks that column.
        const p = hit.point.clone().addScaledVector(ray.ray.direction, 0.02);
        return toTile(p.x, p.z);
      }
    }
    const p = new Vector3();
    return ray.ray.intersectPlane(ground, p) === null ? null : toTile(p.x, p.z);
  };

  let frame = 0;
  let alive = true;
  const tiltClose = (50 * Math.PI) / 180;
  const tiltWide = (62 * Math.PI) / 180;
  let tilt = tiltClose;
  const loop = (now: number): void => {
    if (!alive) return;
    frame = requestAnimationFrame(loop);
    if (document.hidden) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    if (
      canvas.width !== Math.round(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.round(h * renderer.getPixelRatio())
    ) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const t = now / 1000;
    watchFrames(t, lastT === 0 ? 0 : t - lastT);
    const dt = Math.min(0.05, lastT === 0 ? 0 : t - lastT);
    lastT = t;
    if (drv !== null) {
      move(dt);
      const w = toWorld(pos);
      wantTarget = new Vector3(w.x, 0.6, w.z);
      if (opts.reducedMotion) target.copy(wantTarget);
    }
    if (!opts.reducedMotion) {
      target.lerp(wantTarget, 0.16);
      distance += (wantDistance - distance) * 0.16;
      wind.value = t;
      sky?.tick(t);
      birds?.tick(t);
      weather?.tick(t, dt);
      mist?.tick(t);
      quicksandTick(t);
      ghosts?.tick(performance.now());
      for (const l of landmarks)
        if (l.type === 'campfire')
          l.obj.children.forEach((c) => {
            if (c.name === 'flame')
              c.scale.y = 0.85 + Math.sin(t * 11 + c.id) * 0.15;
          });
    }
    if (cin !== null) {
      const age = t - cin.start;
      const going = cin.c.tick(age);
      wantTarget = cin.at.clone().add(new Vector3(0, 0.5, 0));
      wantDistance = cin.kind === 'found' ? 5.4 : 8.5;
      tilt = (cin.kind === 'found' ? 32 : 44) * (Math.PI / 180);
      if (!opts.reducedMotion) {
        yaw = cin.kind === 'found' ? Math.min(1.3, age * 0.45) : 0;
        if (cin.kind === 'tide') {
          tide = 3 + Math.min(1, age / 1.6);
          sea?.setLevel(seaLevelFor(tide));
        }
      } else {
        target.copy(wantTarget);
        distance = wantDistance;
      }
      if (!going) {
        const done = cin.done;
        cin = { ...cin, done: () => undefined };
        done();
      }
    }
    camera.position.set(
      target.x + distance * Math.cos(tilt) * Math.sin(yaw),
      target.y + distance * Math.sin(tilt),
      target.z + distance * Math.cos(tilt) * Math.cos(yaw)
    );
    camera.lookAt(target);
    sea?.tick(opts.reducedMotion ? 0 : t);
    // Keep the sun's shadow box centred on what the camera is looking at.
    if (sun.target.position.distanceToSquared(target) > 1) {
      sun.target.position.copy(target);
      sun.position.copy(target).addScaledVector(sunDir, 40);
    }

    const s = current;
    if (s !== null) {
      const at = drv !== null ? pos : s.sailor;
      if (at !== null) {
        const wpos = toWorld(at);
        sailor.visible = true;
        const ground = heights?.at(wpos.x, wpos.z) ?? 0;
        sailor.position.set(wpos.x, Math.max(ground, seaY() - 0.25), wpos.z);
        sailor.rotation.y = heading;
        explorer.animate(dt, curPose, curSpeed);
      } else sailor.visible = false;
      // Sand puffs: grains thrown out over 300 ms.
      dispose(dynamic);
      dynamic.clear();
      for (const p of s.puffs ?? []) {
        const age = (performance.now() - p.t) / 300;
        if (age < 0 || age >= 1) continue;
        const pw = toWorld(p.at);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const grain = new Mesh(
            new SphereGeometry(0.05 * (1 - age), 4, 3),
            lambert(COL.sand)
          );
          grain.position.set(
            pw.x + Math.cos(a) * age * 0.5,
            topAt(p.at.x, p.at.y) + 0.1 + Math.sin(age * Math.PI) * 0.35,
            pw.z + Math.sin(a) * age * 0.5
          );
          dynamic.add(grain);
        }
      }
      // The X-to-chest line appears once its 500 ms draw-in would have finished.
      if (link !== null)
        link.visible =
          s.linkFrom === undefined || performance.now() - s.linkFrom >= 500;
    }
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(loop);

  return {
    update,
    tileAt,
    setTide: (level) => {
      tide = level;
      sea?.setLevel(seaLevelFor(level));
    },
    drive: (d) => {
      drv = d;
      path = [];
      trapped = 0;
      held = null;
      if (d !== null) {
        pos.x = d.start.x;
        pos.y = d.start.y;
        tileNow = d.start;
        heading = Math.PI;
      }
      if (current !== null) update(current, zoomNow, null);
    },
    input: (x, y, run) => {
      stick.x = x;
      stick.y = y;
      stick.run = run;
    },
    goTo: (t) => {
      if (drv === null) return;
      path = route(tileOf(pos), (c) => c.x === t.x && c.y === t.y);
    },
    pose: (p) => {
      held = p;
      if (p !== null) {
        path = [];
        // Face the camera for the big moments.
        if (p === 'celebrate' || p === 'dejected') heading = 0;
      }
    },
    position: () => (drv === null ? null : { x: pos.x, y: pos.y }),
    ghost: (m) => {
      if (heights === null) return;
      if (ghosts === null) {
        const h = heights;
        ghosts = createGhosts({
          heightAt: (x, z) => Math.max(h.at(x, z), seaY() - 0.2),
          font: "'Bricolage Grotesque', system-ui, sans-serif",
          reduced: opts.reducedMotion,
        });
        ghosts.setVisible(ghostsOn);
        scene.add(ghosts.group);
      }
      ghosts.upsert(m, performance.now());
    },
    showGhosts: (v) => {
      ghostsOn = v;
      ghosts?.setVisible(v);
    },
    setWear: (levels) => {
      if (terrain === null || baseColors === null) return;
      const geo = terrain.geometry;
      const posA = geo.getAttribute('position');
      const colA = geo.getAttribute('color');
      // Bilinear over tile centres, so a trail is a soft path rather than squares.
      const lv = (x: number, y: number): number =>
        x < 0 || y < 0 || x >= W || y >= H ? 0 : (levels[y * W + x] ?? 0);
      for (let v = 0; v < posA.count; v++) {
        const tx = posA.getX(v) + W / 2 - 0.5;
        const ty = posA.getZ(v) + H / 2 - 0.5;
        const x0 = Math.floor(tx);
        const y0 = Math.floor(ty);
        const fx = tx - x0;
        const fy = ty - y0;
        const w =
          (lv(x0, y0) * (1 - fx) + lv(x0 + 1, y0) * fx) * (1 - fy) +
          (lv(x0, y0 + 1) * (1 - fx) + lv(x0 + 1, y0 + 1) * fx) * fy;
        const k = Math.min(0.78, w * 0.3);
        const r = baseColors[v * 3] ?? 0;
        const g = baseColors[v * 3 + 1] ?? 0;
        const b = baseColors[v * 3 + 2] ?? 0;
        colA.setXYZ(
          v,
          r + (dirt.r - r) * k,
          g + (dirt.g - g) * k,
          b + (dirt.b - b) * k
        );
      }
      colA.needsUpdate = true;
    },
    setHat: (tier) => explorer.setHat(tier),
    setSign: (title, by, font) => {
      if (signObj !== null) {
        world.remove(signObj);
        dispose(signObj);
        signObj = null;
      }
      const isl = island;
      if (isl === null || heights === null) return;
      // Beside the jetty, on the first dry tile inland from the dock.
      const d = isl.dock;
      const spot = [
        { x: d.x - 1, y: d.y - 1 },
        { x: d.x + 1, y: d.y - 1 },
        { x: d.x, y: d.y - 2 },
      ].find((t) => tileKind(isl, t.x, t.y) !== 'water') ?? {
        x: d.x - 1,
        y: d.y,
      };
      const w = toWorld(spot);
      signObj = createSign(title, by, font);
      signObj.position.set(w.x, heights.at(w.x, w.z), w.z);
      signObj.rotation.y = 0.15;
      world.add(signObj);
    },
    cinematic: (c) =>
      new Promise<void>((resolve) => {
        const w = toWorld(c.chest);
        const at = new Vector3(w.x, heights?.at(w.x, w.z) ?? 0.3, w.z);
        if (cin !== null) {
          scene.remove(cin.c.group);
          cin.c.dispose();
        }
        const made = createCinematic({
          kind: c.kind,
          at,
          label: c.label,
          stamp: c.stamp,
          font: c.font,
          reduced: opts.reducedMotion,
        });
        scene.add(made.group);
        held = c.kind === 'found' ? 'celebrate' : 'dejected';
        path = [];
        stick.x = 0;
        stick.y = 0;
        if (drv !== null)
          heading = Math.atan2(w.x - toWorld(pos).x, w.z - toWorld(pos).z);
        cin = { c: made, start: lastT, kind: c.kind, at, done: resolve };
      }),
    dispose: () => {
      alive = false;
      cancelAnimationFrame(frame);
      weather?.dispose();
      dispose(scene);
      renderer.dispose();
    },
  };
};
