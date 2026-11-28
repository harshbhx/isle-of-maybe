// Life over the island (ADV-4.1): seabirds wheeling on the breeze, wings beating now and then.
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshLambertMaterial,
} from 'three';
import { hash32 } from '../../../../shared/rng.ts';

const wing = (side: 1 | -1): BufferGeometry => {
  const g = new BufferGeometry();
  g.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        0,
        0,
        -0.12,
        0,
        0,
        0.14,
        side * 0.7,
        0.04,
        0.02,
        side * 0.7,
        0.04,
        0.02,
        side * 1.05,
        -0.05,
        -0.12,
        0,
        0,
        0.14,
      ],
      3
    )
  );
  g.computeVertexNormals();
  return g;
};

export const createBirds = (
  seed: string,
  count: number
): { group: Group; tick: (t: number) => void } => {
  const group = new Group();
  const mat = new MeshLambertMaterial({ color: 0xf7f4ee, side: DoubleSide });
  const dark = new MeshLambertMaterial({ color: 0x3b3b3b, side: DoubleSide });
  const birds: {
    g: Group;
    l: Mesh;
    r: Mesh;
    radius: number;
    speed: number;
    phase: number;
    y: number;
    cx: number;
    cz: number;
  }[] = [];
  const h = hash32(`${seed}:birds`);
  for (let i = 0; i < count; i++) {
    const g = new Group();
    const l = new Mesh(wing(-1), i % 3 === 0 ? dark : mat);
    const r = new Mesh(wing(1), i % 3 === 0 ? dark : mat);
    g.add(l, r);
    g.scale.setScalar(0.45 + ((h >>> i) % 4) * 0.06);
    group.add(g);
    birds.push({
      g,
      l,
      r,
      radius: 9 + ((h >>> (i * 2)) % 14),
      speed: 0.12 + ((h >>> (i + 5)) % 5) * 0.02,
      phase: i * 1.7,
      y: 6 + ((h >>> (i + 9)) % 5),
      cx: ((h >>> (i + 1)) % 9) - 4,
      cz: ((h >>> (i + 3)) % 9) - 4,
    });
  }
  return {
    group,
    tick: (t) => {
      for (const b of birds) {
        const a = t * b.speed + b.phase;
        const x = b.cx + Math.cos(a) * b.radius;
        const z = b.cz + Math.sin(a) * b.radius;
        b.g.position.set(x, b.y + Math.sin(t * 0.7 + b.phase) * 0.6, z);
        b.g.rotation.y = -a;
        b.g.rotation.z = 0.25;
        // Glide most of the time; beat in bursts.
        const beat =
          Math.sin(t * 0.5 + b.phase) > 0.3
            ? Math.sin(t * 9 + b.phase) * 0.55
            : 0.1;
        b.l.rotation.z = beat;
        b.r.rotation.z = -beat;
      }
    },
  };
};
