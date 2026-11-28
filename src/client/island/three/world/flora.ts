// Plants and stone (ADV-4.1): curved palms along the beaches, broadleaf jungle, grass tufts and
// hibiscus on the meadows, cliff stacks on rock, dressed for the day's biome (ADV-10.2): pines in
// Frost, stilt roots in Mangrove, a reef in Coral. All instanced, all swaying in one shared wind.
import {
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { hazardsFor } from '../../../../shared/hazards.ts';
import { hash32 } from '../../../../shared/rng.ts';
import { tileKind, toWorld } from '../../../../shared/relief.ts';
import { coastDistance } from '../../../../shared/tide.ts';
import {
  GRASS,
  H,
  LANDMARK,
  SAND,
  W,
  idx,
  type Island,
} from '../../../../shared/types.ts';
import type { BiomeLook } from './biome.ts';
import type { Heights } from './heights.ts';

export type Wind = { value: number };

/** Lambert with vertex colours, bent by the wind: higher vertices move more (palm tops, leaves). */
export const swayMaterial = (
  wind: Wind,
  stiffness = 1
): MeshLambertMaterial => {
  const m = new MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = wind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 seedXZ = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        #else
          vec2 seedXZ = vec2(0.0);
        #endif
        float bend = max(position.y, 0.0);
        bend = bend * bend * ${(0.05 / stiffness).toFixed(4)};
        float gust = sin(uWind * 1.3 + seedXZ.x * 0.35 + seedXZ.y * 0.2) * 0.7 + sin(uWind * 2.9 + seedXZ.y * 0.9) * 0.3;
        transformed.x += gust * bend;
        transformed.z += cos(uWind * 1.1 + seedXZ.x * 0.5) * bend * 0.5;`
      );
  };
  return m;
};

const paint = (g: BufferGeometry, color: number, shade = 0): BufferGeometry => {
  const out = g.index === null ? g : g.toNonIndexed();
  const c = new Color(color);
  const p = out.getAttribute('position');
  const cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    // A little darker low down: a cheap ambient occlusion.
    const k = 1 - shade + shade * Math.min(1, Math.max(0, p.getY(i) / 2));
    cols[i * 3] = c.r * k;
    cols[i * 3 + 1] = c.g * k;
    cols[i * 3 + 2] = c.b * k;
  }
  out.setAttribute('color', new Float32BufferAttribute(cols, 3));
  return out;
};

const merged = (parts: BufferGeometry[]): BufferGeometry => {
  const flat = parts.map((p) => {
    const n = p.index === null ? p : p.toNonIndexed();
    // mergeGeometries needs matching attributes: keep position, normal, color.
    for (const name of Object.keys(n.attributes))
      if (name !== 'position' && name !== 'normal' && name !== 'color')
        n.deleteAttribute(name);
    return n;
  });
  const g = mergeGeometries(flat, false);
  if (g === null) throw new Error('merge failed');
  g.computeVertexNormals();
  return g;
};

/** A palm: a curved, ringed trunk and a crown of drooping fronds. Origin at the foot. */
const palmGeometry = (look: BiomeLook): BufferGeometry => {
  const parts: BufferGeometry[] = [];
  const segs = 6;
  let x = 0;
  let y = 0;
  for (let i = 0; i < segs; i++) {
    const r0 = 0.09 - i * 0.008;
    const seg = new CylinderGeometry(r0 - 0.008, r0, 0.42, 7);
    const lean = 0.05 + i * 0.035;
    seg.rotateZ(-lean);
    seg.translate(x + Math.sin(lean) * 0.21, y + 0.21, 0);
    parts.push(
      paint(seg, i % 2 === 0 ? look.palmTrunk[0] : look.palmTrunk[1], 0.3)
    );
    x += Math.sin(lean) * 0.42;
    y += Math.cos(lean) * 0.42;
  }
  const top = new Vector3(x, y, 0);
  const fronds = 8;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2;
    const leaf = new ConeGeometry(0.16, 1.25, 4, 1);
    leaf.scale(1, 1, 0.22);
    leaf.translate(0, 0.62, 0);
    // Tip out and droop.
    leaf.rotateZ(-1.15 - (f % 2) * 0.25);
    leaf.rotateY(a);
    leaf.translate(top.x, top.y, top.z);
    parts.push(
      paint(leaf, f % 3 === 0 ? look.palmLeaf[0] : look.palmLeaf[1], 0)
    );
  }
  for (let k = 0; k < 3; k++) {
    const nut = new SphereGeometry(0.07, 6, 4);
    nut.translate(
      top.x + Math.cos(k * 2.1) * 0.08,
      top.y - 0.08,
      Math.sin(k * 2.1) * 0.08
    );
    parts.push(paint(nut, 0x6b4a22));
  }
  return merged(parts);
};

/** A pine: a straight trunk under three stacked cones (Frost). */
const pineGeometry = (look: BiomeLook): BufferGeometry => {
  const trunk = new CylinderGeometry(0.05, 0.08, 0.6, 6);
  trunk.translate(0, 0.3, 0);
  const parts = [paint(trunk, look.treeTrunk, 0.3)];
  const tiers: [number, number, number][] = [
    [0.5, 0.62, 0.75],
    [0.4, 0.55, 1.15],
    [0.28, 0.48, 1.5],
  ];
  tiers.forEach(([r, h, y], i) => {
    const cone = new ConeGeometry(r, h, 7, 1);
    cone.translate(0, y, 0);
    parts.push(paint(cone, look.treeLeaves[i % 3] ?? look.treeLeaves[0], 0.2));
    // Snow caught on each tier.
    const cap = new ConeGeometry(r * 0.55, h * 0.4, 7, 1);
    cap.translate(0, y + h * 0.3, 0);
    parts.push(paint(cap, 0xf4f8fa, 0));
  });
  return merged(parts);
};

/** A mangrove: a crown held up on arching stilt roots (Mangrove). */
const mangroveGeometry = (look: BiomeLook): BufferGeometry => {
  const trunk = new CylinderGeometry(0.06, 0.08, 0.6, 6);
  trunk.translate(0, 0.62, 0);
  const parts = [paint(trunk, look.treeTrunk, 0.2)];
  for (let r = 0; r < 5; r++) {
    const a = (r / 5) * Math.PI * 2;
    const root = new CylinderGeometry(0.025, 0.035, 0.62, 4);
    root.translate(0, 0.31, 0);
    root.rotateZ(0.55);
    root.rotateY(a);
    root.translate(0, 0.05, 0);
    parts.push(paint(root, look.treeTrunk, 0.4));
  }
  const crowns: [number, number, number, number][] = [
    [0, 1.1, 0, 0.6],
    [0.32, 1.0, 0.15, 0.42],
    [-0.3, 1.02, -0.12, 0.44],
  ];
  crowns.forEach(([cx, cy, cz, r], i) => {
    const blob = new IcosahedronGeometry(r, 1);
    blob.scale(1.15, 0.6, 1.15);
    blob.translate(cx, cy, cz);
    parts.push(paint(blob, look.treeLeaves[i % 3] ?? look.treeLeaves[0], 0));
  });
  return merged(parts);
};

/** A broadleaf jungle tree: short trunk, three overlapping crowns. */
const treeGeometry = (look: BiomeLook): BufferGeometry => {
  if (look.tree === 'pine') return pineGeometry(look);
  if (look.tree === 'mangrove') return mangroveGeometry(look);
  const trunk = new CylinderGeometry(0.07, 0.11, 0.9, 6);
  trunk.translate(0, 0.45, 0);
  const parts = [paint(trunk, look.treeTrunk, 0.3)];
  const [c0, c1, c2] = look.treeLeaves;
  const crowns: [number, number, number, number, number][] = [
    [0, 1.05, 0, 0.55, c0],
    [0.28, 0.9, 0.12, 0.42, c1],
    [-0.22, 0.95, -0.18, 0.45, c2],
  ];
  for (const [cx, cy, cz, r, c] of crowns) {
    const blob = new IcosahedronGeometry(r, 1);
    blob.scale(1, 0.85, 1);
    blob.translate(cx, cy, cz);
    parts.push(paint(blob, c, 0));
  }
  return merged(parts);
};

/** A grass tuft: five thin blades. */
const tuftGeometry = (look: BiomeLook): BufferGeometry => {
  const parts: BufferGeometry[] = [];
  for (let b = 0; b < 5; b++) {
    const blade = new ConeGeometry(0.025, 0.28 + (b % 3) * 0.06, 3, 1);
    blade.translate(0, 0.14, 0);
    blade.rotateZ((b - 2) * 0.22);
    blade.rotateY(b * 1.3);
    blade.translate(Math.cos(b * 2.4) * 0.05, 0, Math.sin(b * 2.4) * 0.05);
    parts.push(paint(blade, b % 2 === 0 ? look.tuft[0] : look.tuft[1], 0.35));
  }
  return merged(parts);
};

/** A hibiscus shrub: a leafy mound with a few red flowers. */
const shrubGeometry = (look: BiomeLook): BufferGeometry => {
  const bush = new IcosahedronGeometry(0.26, 1);
  bush.scale(1.2, 0.8, 1.1);
  bush.translate(0, 0.18, 0);
  const parts = [paint(bush, look.bush)];
  for (let f = 0; f < 4; f++) {
    const fl = new SphereGeometry(0.06, 5, 4);
    fl.translate(
      Math.cos(f * 1.7) * 0.22,
      0.28 + (f % 2) * 0.06,
      Math.sin(f * 1.7) * 0.2
    );
    parts.push(paint(fl, f % 2 === 0 ? look.flowers[0] : look.flowers[1]));
  }
  return merged(parts);
};

/** A cliff stack for rock tiles. */
const cliffGeometry = (look: BiomeLook): BufferGeometry => {
  const parts: BufferGeometry[] = [];
  const blocks: [number, number, number, number, number][] = [
    [0, 0.35, 0, 0.55, 1.3],
    [0.25, 0.25, 0.2, 0.4, 1],
    [-0.22, 0.2, -0.15, 0.38, 0.9],
  ];
  for (const [x, y, z, r, sy] of blocks) {
    const g = new DodecahedronGeometry(r, 0);
    g.scale(1, sy, 0.9);
    g.translate(x, y, z);
    parts.push(paint(g, x === 0 ? look.cliff[0] : look.cliff[1], 0.15));
  }
  return merged(parts);
};

/** A reef head: branching pink and orange coral on a pale stone (Coral). */
const coralGeometry = (): BufferGeometry => {
  const parts: BufferGeometry[] = [];
  const base = new DodecahedronGeometry(0.22, 0);
  base.scale(1.2, 0.45, 1);
  parts.push(paint(base, 0xd9cdb5, 0.2));
  const tints = [0xff7a8a, 0xff9f43, 0xc86bfa, 0xff6f61];
  for (let b = 0; b < 6; b++) {
    const arm = new CylinderGeometry(0.02, 0.04, 0.32 + (b % 3) * 0.08, 5);
    arm.translate(0, 0.18, 0);
    arm.rotateZ((b - 2.5) * 0.25);
    arm.rotateY(b * 1.1);
    arm.translate(Math.cos(b * 2.1) * 0.09, 0.05, Math.sin(b * 2.1) * 0.09);
    parts.push(paint(arm, tints[b % 4] ?? 0xff7a8a, 0.25));
  }
  const fan = new SphereGeometry(0.1, 6, 4);
  fan.scale(1.3, 0.8, 0.4);
  fan.translate(-0.08, 0.2, 0.04);
  parts.push(paint(fan, 0xffd166, 0.1));
  return merged(parts);
};

export type Flora = { meshes: InstancedMesh[]; materials: Material[] };

const rand = (seed: string, k: number): number =>
  (hash32(`${seed}|${k}`) % 10000) / 10000;

export const createFlora = (
  island: Island,
  heights: Heights,
  wind: Wind,
  density: number,
  look: BiomeLook
): Flora => {
  const coast = coastDistance(island);
  const hz = hazardsFor(island);
  const palms: Matrix4[] = [];
  const trees: Matrix4[] = [];
  const tufts: Matrix4[] = [];
  const shrubs: Matrix4[] = [];
  const cliffs: Matrix4[] = [];
  const reef: Matrix4[] = [];
  const tmp = new Object3D();
  const put = (
    out: Matrix4[],
    wx: number,
    wz: number,
    s: number,
    ry: number,
    sink = 0.02
  ): void => {
    tmp.position.set(wx, heights.at(wx, wz) - sink, wz);
    tmp.rotation.set(0, ry, 0);
    tmp.scale.setScalar(s);
    tmp.updateMatrix();
    out.push(tmp.matrix.clone());
  };
  const s = island.seed;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      const code = island.terrain[i];
      const k = tileKind(island, x, y);
      const w = toWorld({ x, y });
      const r1 = rand(s, i * 7);
      const r2 = rand(s, i * 7 + 1);
      const r3 = rand(s, i * 7 + 2);
      const dock =
        Math.max(Math.abs(x - island.dock.x), Math.abs(y - island.dock.y)) <= 1;
      if (code === LANDMARK || dock) continue;
      if (k === 'water') {
        // Coral reefs grow in the shallows just off the beach.
        if (look.ambient !== 'reef' || r1 > 0.55) continue;
        let nearLand = false;
        for (let dy = -2; dy <= 2 && !nearLand; dy++)
          for (let dx = -2; dx <= 2 && !nearLand; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            nearLand =
              nx >= 0 &&
              ny >= 0 &&
              nx < W &&
              ny < H &&
              tileKind(island, nx, ny) !== 'water';
          }
        const bed = heights.at(w.x, w.z);
        // Big enough that the heads break the surface, as reefs do at low water.
        if (nearLand && bed < 0.05 && bed > -1.2)
          put(
            reef,
            w.x + (r2 - 0.5) * 0.6,
            w.z + (r3 - 0.5) * 0.6,
            1.6 + r2 * 0.9,
            r3 * 6,
            0
          );
        continue;
      }
      if (k === 'jungle') {
        const n = 2 + Math.floor(r1 * 2);
        for (let t = 0; t < n; t++)
          put(
            trees,
            w.x + (rand(s, i * 9 + t) - 0.5) * 0.8,
            w.z + (rand(s, i * 11 + t) - 0.5) * 0.8,
            0.8 + rand(s, i * 13 + t) * 0.5,
            rand(s, i + t) * 6
          );
      } else if (k === 'rock') {
        put(
          cliffs,
          w.x + (r1 - 0.5) * 0.2,
          w.z + (r2 - 0.5) * 0.2,
          0.9 + r3 * 0.4,
          r1 * 6,
          0.15
        );
      } else if (code === SAND) {
        // Palms lean over the upper beach, clear of the tide line.
        const d = coast[i] ?? 0;
        if (d >= 3 && r1 < 0.16 * density + 0.04)
          put(
            // Biomes with fewer palms put their own trees on the upper beach instead.
            r3 < look.palms ? palms : trees,
            w.x + (r2 - 0.5) * 0.5,
            w.z + (r3 - 0.5) * 0.5,
            0.85 + r2 * 0.45,
            r3 * 6.28
          );
      } else if (code === GRASS) {
        if (hz.thicket.has(i)) {
          put(
            trees,
            w.x + (r1 - 0.5) * 0.6,
            w.z + (r2 - 0.5) * 0.6,
            0.45 + r3 * 0.25,
            r1 * 6
          );
          put(
            shrubs,
            w.x - (r2 - 0.5) * 0.5,
            w.z - (r1 - 0.5) * 0.5,
            0.9,
            r2 * 6
          );
        } else if (r1 < 0.06) {
          put(
            r3 < look.palms ? palms : trees,
            w.x + (r2 - 0.5) * 0.5,
            w.z + (r3 - 0.5) * 0.5,
            0.9 + r2 * 0.4,
            r3 * 6.28
          );
        } else if (r1 < 0.12) {
          put(
            shrubs,
            w.x + (r2 - 0.5) * 0.6,
            w.z + (r3 - 0.5) * 0.6,
            0.8 + r3 * 0.4,
            r2 * 6
          );
        }
        const tn = Math.round(density * (1 + r3 * 2));
        for (let t = 0; t < tn; t++)
          put(
            tufts,
            w.x + (rand(s, i * 17 + t) - 0.5) * 0.9,
            w.z + (rand(s, i * 19 + t) - 0.5) * 0.9,
            0.8 + rand(s, i * 23 + t) * 0.6,
            rand(s, i * 29 + t) * 6,
            0
          );
      }
    }
  const materials: Material[] = [];
  const meshes: InstancedMesh[] = [];
  const make = (
    geo: BufferGeometry,
    list: Matrix4[],
    stiffness: number,
    shadow: boolean
  ): void => {
    if (list.length === 0) return;
    const mat =
      stiffness > 0
        ? swayMaterial(wind, stiffness)
        : new MeshLambertMaterial({ vertexColors: true });
    materials.push(mat);
    const mesh = new InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    meshes.push(mesh);
  };
  make(palmGeometry(look), palms, 1, true);
  make(treeGeometry(look), trees, look.tree === 'pine' ? 4 : 2.5, true);
  make(tuftGeometry(look), tufts, 0.35, false);
  make(shrubGeometry(look), shrubs, 3, true);
  make(cliffGeometry(look), cliffs, 0, true);
  make(coralGeometry(), reef, 0, false);
  return { meshes, materials };
};
