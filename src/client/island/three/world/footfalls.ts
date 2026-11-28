// Footfalls (ADV-11.3): small puffs from the explorer's feet, sand on the beach, dust on grass and
// earth, rings when wading. A fixed pool of sprites, so moving never allocates.
import { Group, Sprite, SpriteMaterial } from 'three';
import { puffTexture } from './weather.ts';

export type Footing = 'sand' | 'earth' | 'water';

const POOL = 28;
const LIFE = 0.55;

export type Footfalls = {
  group: Group;
  /** Call every frame while the explorer exists; `speed` is tiles per second (0 when still). */
  tick: (
    dt: number,
    x: number,
    y: number,
    z: number,
    speed: number,
    footing: Footing
  ) => void;
  dispose: () => void;
};

export const createFootfalls = (tints: Record<Footing, number>): Footfalls => {
  const group = new Group();
  const map = puffTexture(false);
  const items = Array.from({ length: POOL }, () => {
    const m = new SpriteMaterial({
      map,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    const s = new Sprite(m);
    s.visible = false;
    s.renderOrder = 3;
    group.add(s);
    return { s, m, age: LIFE, vx: 0, vz: 0, ring: false };
  });
  let next = 0;
  let since = 0;
  let side = 1;
  const emit = (
    x: number,
    y: number,
    z: number,
    footing: Footing,
    speed: number
  ): void => {
    const it = items[next];
    next = (next + 1) % POOL;
    if (it === undefined) return;
    it.age = 0;
    it.ring = footing === 'water';
    it.m.color.setHex(tints[footing]);
    side = -side;
    // Puffs land a little to each side of the trail and drift back from the stride.
    const spread = 0.09 * side;
    it.s.position.set(
      x + spread,
      y + (it.ring ? 0.02 : 0.05),
      z + spread * 0.6
    );
    it.vx = (Math.random() - 0.5) * 0.25;
    it.vz = (Math.random() - 0.5) * 0.25;
    it.s.scale.setScalar(it.ring ? 0.25 : 0.12 + speed * 0.02);
    it.s.visible = true;
  };
  return {
    group,
    tick: (dt, x, y, z, speed, footing) => {
      if (speed > 0.1) {
        since += dt;
        // Running kicks up about twice as much as walking.
        const every = speed > 3 ? 0.11 : 0.2;
        if (since >= every) {
          since = 0;
          emit(x, y, z, footing, speed);
        }
      } else since = 0;
      for (const it of items) {
        if (!it.s.visible) continue;
        it.age += dt;
        const l = it.age / LIFE;
        if (l >= 1) {
          it.s.visible = false;
          continue;
        }
        if (it.ring) {
          // A splash ring spreads flat on the water and fades.
          it.s.scale.setScalar(0.25 + l * 0.9);
          it.m.opacity = (1 - l) * 0.55;
        } else {
          it.s.position.x += it.vx * dt;
          it.s.position.z += it.vz * dt;
          it.s.position.y += dt * 0.35;
          it.s.scale.setScalar(it.s.scale.x + dt * 0.55);
          it.m.opacity = Math.sin(l * Math.PI) * 0.6;
        }
      }
    },
    dispose: () => {
      for (const it of items) it.m.dispose();
      map.dispose();
    },
  };
};
