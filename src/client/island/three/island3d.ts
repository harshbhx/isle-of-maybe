// The 3D island (UI-3.1, UI-3.6, UI-5.1): a chunky low-poly world in three.js under a tropical sky.
// Terrain columns per tile, a faceted sea over a shallow lagoon floor, landmark models, the sailor,
// footprints, holes, route dots, reveal markers and low cloud over unseen land. Loaded lazily by
// IslandCanvas, which falls back to the 2D renderer if anything here fails (UI-3.5).
import {
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
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
import {
  H,
  W,
  WATER,
  idx,
  type Island,
  type Tile,
} from '../../../shared/types.ts';
import {
  cloudAt,
  cloudTiles,
  landmarkVisible,
  tileKind,
  tileTop,
  tilesAcross,
  toTile,
  toWorld,
  type TileKind,
} from '../../../shared/relief.ts';
import type { Scene } from '../draw.ts';

export type Island3D = {
  update: (
    scene: Omit<Scene, 'now'>,
    zoom: number,
    focus: { x: number; y: number } | null
  ) => void;
  tileAt: (px: number, py: number) => Tile | null;
  dispose: () => void;
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

const STEPS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
/** A footprint is two small prints, left and right. */
const PRINTS: readonly (readonly [number, number])[] = [
  [-0.08, 0.04],
  [0.08, -0.04],
];

const TOP_COLOUR: Record<TileKind, number> = {
  water: COL.sea,
  sand: COL.sand,
  grass: COL.grass,
  jungle: COL.grass2,
  rock: COL.grass2,
  pond: COL.pond,
};
const SIDE_COLOUR: Record<TileKind, number> = {
  water: COL.sea,
  sand: COL.sandSide,
  grass: COL.grassSide,
  jungle: COL.grassSide,
  rock: COL.grassSide,
  pond: COL.sandSide,
};

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

/** One non-indexed geometry for every land tile: a top face and only the sides that show. */
const buildTerrain = (island: Island): BufferGeometry => {
  const pos: number[] = [];
  const col: number[] = [];
  const c = new Color();
  const quad = (
    a: number[],
    b: number[],
    cc: number[],
    d: number[],
    colour: number,
    shade: number
  ): void => {
    c.setHex(colour).multiplyScalar(shade);
    for (const v of [a, b, cc, a, cc, d]) {
      pos.push(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
      col.push(c.r, c.g, c.b);
    }
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = tileKind(island, x, y);
      if (k === 'water') continue;
      const top = tileTop(island, x, y);
      const { x: cx, z: cz } = toWorld({ x, y });
      const x0 = cx - 0.5;
      const x1 = cx + 0.5;
      const z0 = cz - 0.5;
      const z1 = cz + 0.5;
      const grass2 = k === 'grass' && (x * 7 + y * 13) % 3 === 0;
      quad(
        [x0, top, z0],
        [x0, top, z1],
        [x1, top, z1],
        [x1, top, z0],
        grass2 ? COL.grass2 : TOP_COLOUR[k],
        1
      );
      const side = SIDE_COLOUR[k];
      const n = (dx: number, dy: number): number =>
        x + dx < 0 || y + dy < 0 || x + dx >= W || y + dy >= H
          ? -0.6
          : tileKind(island, x + dx, y + dy) === 'water'
            ? -0.6
            : tileTop(island, x + dx, y + dy);
      const s = n(0, 1);
      if (s < top)
        quad(
          [x0, s, z1],
          [x1, s, z1],
          [x1, top, z1],
          [x0, top, z1],
          side,
          0.95
        );
      const nn = n(0, -1);
      if (nn < top)
        quad(
          [x1, nn, z0],
          [x0, nn, z0],
          [x0, top, z0],
          [x1, top, z0],
          side,
          0.7
        );
      const e = n(1, 0);
      if (e < top)
        quad(
          [x1, e, z1],
          [x1, e, z0],
          [x1, top, z0],
          [x1, top, z1],
          side,
          0.82
        );
      const wv = n(-1, 0);
      if (wv < top)
        quad(
          [x0, wv, z0],
          [x0, wv, z1],
          [x0, top, z1],
          [x0, top, z0],
          side,
          0.78
        );
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  g.computeVertexNormals();
  return g;
};

/** The lagoon floor: shallow and light next to land, deep and dark further out. */
const buildSeabed = (island: Island): BufferGeometry => {
  const M = 20;
  const N = W + 2 * M;
  const dist = new Float32Array(N * N).fill(99);
  const queue: number[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (island.terrain[idx(x, y)] !== WATER) {
        const i = (y + M) * N + (x + M);
        dist[i] = 0;
        queue.push(i);
      }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q] ?? 0;
    const d = dist[i] ?? 0;
    const x = i % N;
    const y = Math.floor(i / N);
    for (const [dx, dy] of STEPS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const j = ny * N + nx;
      if ((dist[j] ?? 0) > d + 1) {
        dist[j] = d + 1;
        queue.push(j);
      }
    }
  }
  const g = new PlaneGeometry(N, N, N - 1, N - 1);
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute('position');
  const colours = new Float32Array(p.count * 3);
  const shallow = new Color(COL.shallows);
  const deep = new Color(COL.deep);
  const c = new Color();
  for (let v = 0; v < p.count; v++) {
    const d = dist[v] ?? 99;
    const t = Math.min(1, Math.max(0, (d - 1) / 6));
    p.setY(v, -0.12 - t * 1.3);
    c.copy(shallow).lerp(deep, t);
    colours[v * 3] = c.r;
    colours[v * 3 + 1] = c.g;
    colours[v * 3 + 2] = c.b;
  }
  g.setAttribute('color', new BufferAttribute(colours, 3));
  g.computeVertexNormals();
  return g;
};

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

const sailorModel = (): Group => {
  const g = new Group();
  const body = new Mesh(
    new CylinderGeometry(0.12, 0.15, 0.36, 8),
    lambert(COL.coat)
  );
  body.position.y = 0.2;
  const head = new Mesh(
    new SphereGeometry(0.11, 10, 8),
    lambert(COL.skin, { flat: false })
  );
  head.position.y = 0.48;
  const brim = new Mesh(
    new CylinderGeometry(0.17, 0.17, 0.02, 12),
    lambert(COL.ink)
  );
  brim.position.y = 0.56;
  const hat = new Mesh(new ConeGeometry(0.11, 0.16, 8), lambert(COL.ink));
  hat.position.y = 0.64;
  const scarf = new Mesh(
    new TorusGeometry(0.11, 0.025, 4, 10),
    lambert(COL.hibiscus)
  );
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 0.38;
  g.add(body, head, brim, hat, scarf);
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
  opts: { reducedMotion: boolean; onFail: () => void }
): Island3D => {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    opts.onFail();
  });

  const scene = new ThreeScene();
  scene.background = new Color(COL.deep);
  scene.fog = new Fog(COL.deep, 34, 80);
  const camera = new PerspectiveCamera(35, 1, 0.1, 220);
  scene.add(new HemisphereLight(COL.sky, COL.sea, 1.6));
  scene.add(new AmbientLight(0xffffff, 0.35));
  const sun = new DirectionalLight(0xfff1d0, 2.4);
  sun.position.set(-14, 26, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  // The open sea: a faceted plane that swells slowly (held still under reduced motion).
  const seaGeo = new PlaneGeometry(140, 140, 70, 70);
  seaGeo.rotateX(-Math.PI / 2);
  const seaBase = Float32Array.from(seaGeo.getAttribute('position').array);
  const sea = new Mesh(
    seaGeo,
    lambert(COL.sea, { transparent: true, opacity: 0.7 })
  );
  sea.position.y = 0.04;
  sea.receiveShadow = true;
  scene.add(sea);

  const world = new Group();
  scene.add(world);
  const dynamic = new Group();
  scene.add(dynamic);
  const sailor = sailorModel();
  sailor.scale.setScalar(1.35);
  sailor.visible = false;
  scene.add(sailor);

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
  let clouds: InstancedMesh | null = null;
  let cloudIdx: number[] = [];
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
  const tmp = new Object3D();
  const target = new Vector3(0, 0, 0);
  let distance = 40;
  let wantTarget = new Vector3(0, 0, 0);
  let wantDistance = 40;
  let snapped = false;
  let current: Omit<Scene, 'now'> | null = null;
  const topAt = (x: number, y: number): number =>
    island === null
      ? 0
      : tileKind(island, x, y) === 'water'
        ? 0.04
        : tileTop(island, x, y);

  const build = (next: Island): void => {
    dispose(world);
    world.clear();
    island = next;
    terrain = new Mesh(
      buildTerrain(next),
      new MeshLambertMaterial({ vertexColors: true, flatShading: true })
    );
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    world.add(terrain);
    const bed = new Mesh(
      buildSeabed(next),
      new MeshLambertMaterial({ vertexColors: true, flatShading: true })
    );
    bed.receiveShadow = true;
    world.add(bed);
    // Dock planks out into the water.
    const dw = toWorld(next.dock);
    for (let i = 0; i < 3; i++) {
      const plank = new Mesh(
        new BoxGeometry(0.8, 0.06, 0.22),
        lambert(COL.plank)
      );
      plank.position.set(dw.x, 0.18, dw.z + 0.2 + i * 0.3);
      plank.castShadow = true;
      world.add(plank);
    }
    // What blocks the way: jungle trees and boulders on raised mounds (instanced, one draw each).
    const jungle: Tile[] = [];
    const rocks: Tile[] = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const k = tileKind(next, x, y);
        if (k === 'jungle') jungle.push({ x, y });
        else if (k === 'rock') rocks.push({ x, y });
      }
    const canopy = new InstancedMesh(
      new IcosahedronGeometry(0.36, 0),
      lambert(COL.jungle),
      jungle.length * 2
    );
    const trunks = new InstancedMesh(
      new CylinderGeometry(0.05, 0.07, 0.4, 5),
      lambert(COL.wood),
      jungle.length * 2
    );
    let ti = 0;
    for (const t of jungle) {
      const w = toWorld(t);
      const top = tileTop(next, t.x, t.y);
      for (let k = 0; k < 2; k++) {
        const h = (t.x * 73 + t.y * 37 + k * 11) % 7;
        const ox = (k === 0 ? -0.2 : 0.2) + (h - 3) * 0.02;
        const oz = (k === 0 ? 0.15 : -0.15) + (3 - h) * 0.02;
        const sc = 0.85 + (h % 3) * 0.15;
        tmp.position.set(w.x + ox, top + 0.2 * sc, w.z + oz);
        tmp.rotation.set(0, 0, 0);
        tmp.scale.setScalar(sc);
        tmp.updateMatrix();
        trunks.setMatrixAt(ti, tmp.matrix);
        tmp.position.y = top + 0.55 * sc;
        tmp.rotation.set(h * 0.4, h, 0);
        tmp.scale.set(sc, sc * 1.1, sc);
        tmp.updateMatrix();
        canopy.setMatrixAt(ti, tmp.matrix);
        ti++;
      }
    }
    canopy.castShadow = true;
    trunks.castShadow = true;
    const boulders = new InstancedMesh(
      new IcosahedronGeometry(0.4, 0),
      lambert(COL.rock),
      rocks.length
    );
    rocks.forEach((t, i) => {
      const w = toWorld(t);
      const h = (t.x * 29 + t.y * 53) % 5;
      tmp.position.set(
        w.x + (h - 2) * 0.04,
        tileTop(next, t.x, t.y) + 0.22,
        w.z
      );
      tmp.rotation.set(h * 0.5, h * 1.3, 0);
      tmp.scale.set(1 + h * 0.05, 0.75 + h * 0.06, 0.95);
      tmp.updateMatrix();
      boulders.setMatrixAt(i, tmp.matrix);
    });
    boulders.castShadow = true;
    boulders.receiveShadow = true;
    world.add(canopy, trunks, boulders);

    landmarks = next.landmarks.map((l) => {
      const obj = landmarkModel(l.type);
      obj.scale.setScalar(1.45);
      const w = toWorld(l.at);
      obj.position.set(w.x, tileTop(next, l.at.x, l.at.y), w.z);
      obj.rotation.y = ((l.at.x * 31 + l.at.y * 17) % 8) * 0.25 - 1;
      world.add(obj);
      return { type: l.type, at: l.at, obj };
    });
    cloudIdx = cloudTiles(next);
    const cg = new IcosahedronGeometry(0.72, 1);
    clouds = new InstancedMesh(
      cg,
      lambert(COL.cloud, { emissive: 0x3c4a46 }),
      cloudIdx.length
    );
    world.add(clouds);
    lastSeen = undefined;
    markerKey = '';
    holesKey = '';
  };

  const refreshClouds = (seen: Uint8Array | null): void => {
    if (clouds === null || island === null) return;
    cloudIdx.forEach((i, n) => {
      const state = cloudAt(seen, i);
      const x = i % W;
      const y = Math.floor(i / W);
      const w = toWorld({ x, y });
      const jitter = ((x * 13 + y * 7) % 5) * 0.07;
      const s = state === 'none' ? 0.0001 : state === 'thin' ? 0.62 : 1;
      tmp.position.set(
        w.x,
        1.35 + jitter + (state === 'thin' ? -0.25 : 0),
        w.z
      );
      tmp.rotation.set(0, (x + y) * 0.7, 0);
      tmp.scale.set(1.12 * s, 0.62 * s, 1.12 * s);
      tmp.updateMatrix();
      clouds?.setMatrixAt(n, tmp.matrix);
    });
    clouds.instanceMatrix.needsUpdate = true;
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
    if (!snapped || opts.reducedMotion) {
      target.copy(wantTarget);
      distance = wantDistance;
      snapped = true;
    }
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
  const seaPos = seaGeo.getAttribute('position');
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
    if (!opts.reducedMotion) {
      target.lerp(wantTarget, 0.16);
      distance += (wantDistance - distance) * 0.16;
      for (let v = 0; v < seaPos.count; v++) {
        const x = seaBase[v * 3] ?? 0;
        const z = seaBase[v * 3 + 2] ?? 0;
        seaPos.setY(
          v,
          Math.sin(x * 0.55 + t * 0.9) * 0.05 +
            Math.cos(z * 0.7 + t * 1.2) * 0.04
        );
      }
      seaPos.needsUpdate = true;
      if (clouds !== null) clouds.position.y = Math.sin(t * 0.6) * 0.05;
      for (const l of landmarks)
        if (l.type === 'campfire')
          l.obj.children.forEach((c) => {
            if (c.name === 'flame')
              c.scale.y = 0.85 + Math.sin(t * 11 + c.id) * 0.15;
          });
    }
    camera.position.set(
      target.x,
      target.y + distance * Math.sin(tilt),
      target.z + distance * Math.cos(tilt)
    );
    camera.lookAt(target);

    const s = current;
    if (s !== null) {
      if (s.sailor !== null) {
        const sx = s.sailor.x;
        const sy = s.sailor.y;
        const wpos = toWorld({ x: sx, y: sy });
        sailor.visible = true;
        sailor.position.set(
          wpos.x,
          topAt(Math.round(sx), Math.round(sy)),
          wpos.z
        );
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
    dispose: () => {
      alive = false;
      cancelAnimationFrame(frame);
      dispose(scene);
      renderer.dispose();
    },
  };
};
