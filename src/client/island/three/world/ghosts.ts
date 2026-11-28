// Ghost explorers (ADV-6.7): other redditors hunting this island right now, drawn as faint,
// lantern-lit figures with their u/name, gliding between pings and fading out when they stop.
import {
  AdditiveBlending,
  CanvasTexture,
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SRGBColorSpace,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
} from 'three';
import {
  GHOST_EVERY_MS,
  GHOST_FADE_MS,
  MAX_GHOSTS,
  type GhostMessage,
} from '../../../../shared/ghost.ts';
import { toWorld } from '../../../../shared/relief.ts';
import type { Tier } from '../../../../shared/scoring.ts';

const HAT: Record<Tier, number> = {
  deckhand: 0xe2c26b,
  mapmaker: 0x8a5a2b,
  navigator: 0x2f5d3a,
  cartographer: 0x2f4a7a,
  legend: 0x221c18,
};

const label = (text: string, font: string): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  if (g !== null) {
    g.font = `700 28px ${font}`;
    const w = Math.min(248, g.measureText(text).width + 24);
    g.fillStyle = 'rgba(10,100,104,0.72)';
    g.beginPath();
    g.roundRect((256 - w) / 2, 8, w, 46, 23);
    g.fill();
    g.fillStyle = '#FFF7E8';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 128, 32);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};

const glowTexture = (): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  if (g !== null) {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,214,120,1)');
    r.addColorStop(0.4, 'rgba(255,178,30,0.45)');
    r.addColorStop(1, 'rgba(255,178,30,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(c);
};

type Ghost = {
  group: Group;
  fade: (k: number) => void;
  from: { x: number; z: number };
  to: { x: number; z: number };
  t0: number;
  last: number;
  dispose: () => void;
};

export type Ghosts = {
  group: Group;
  upsert: (m: GhostMessage, now: number) => void;
  tick: (now: number) => void;
  setVisible: (v: boolean) => void;
  dispose: () => void;
};

export const createGhosts = (opts: {
  heightAt: (wx: number, wz: number) => number;
  font: string;
  reduced: boolean;
}): Ghosts => {
  const group = new Group();
  const ghosts = new Map<string, Ghost>();
  const glow = glowTexture();

  const make = (m: GhostMessage, now: number): Ghost => {
    const g = new Group();
    const body = new MeshLambertMaterial({
      color: 0xd9f2f0,
      emissive: 0x5fa8a6,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const torso = new Mesh(new CapsuleGeometry(0.15, 0.42, 4, 10), body);
    torso.position.y = 0.45;
    const head = new Mesh(new SphereGeometry(0.11, 10, 8), body);
    head.position.y = 0.86;
    const hatMat = new MeshLambertMaterial({
      color: HAT[m.tier],
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const brim = new Mesh(new CylinderGeometry(0.2, 0.2, 0.02, 16), hatMat);
    brim.position.y = 0.93;
    const crown = new Mesh(new CylinderGeometry(0.09, 0.11, 0.11, 12), hatMat);
    crown.position.y = 0.99;
    const lantern = new Mesh(
      new SphereGeometry(0.05, 8, 6),
      new MeshBasicMaterial({ color: 0xffd678 })
    );
    lantern.position.set(0.22, 0.5, 0.05);
    const haloMat = new SpriteMaterial({
      map: glow,
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const halo = new Sprite(haloMat);
    halo.scale.setScalar(0.9);
    halo.position.copy(lantern.position);
    const tagMat = new SpriteMaterial({
      map: label(`u/${m.name}`, opts.font),
      depthWrite: false,
      transparent: true,
    });
    const tag = new Sprite(tagMat);
    tag.scale.set(1.6, 0.4, 1);
    tag.position.y = 1.35;
    g.add(torso, head, brim, crown, lantern, halo, tag);
    const w = toWorld(m);
    g.position.set(w.x, opts.heightAt(w.x, w.z), w.z);
    group.add(g);
    return {
      group: g,
      fade: (k) => {
        body.opacity = 0.5 * k;
        hatMat.opacity = 0.7 * k;
        haloMat.opacity = k;
        tagMat.opacity = k;
        lantern.visible = k > 0.2;
      },
      from: w,
      to: w,
      t0: now,
      last: now,
      dispose: () => {
        g.traverse((o) => {
          if (o instanceof Mesh) o.geometry.dispose();
        });
        body.dispose();
        hatMat.dispose();
        haloMat.dispose();
        tagMat.map?.dispose();
        tagMat.dispose();
      },
    };
  };

  return {
    group,
    upsert: (m, now) => {
      let g = ghosts.get(m.name);
      if (g === undefined) {
        if (ghosts.size >= MAX_GHOSTS) {
          // Drop the stalest ghost to make room.
          let old: [string, Ghost] | null = null;
          for (const e of ghosts)
            if (old === null || e[1].last < old[1].last) old = e;
          if (old !== null) {
            group.remove(old[1].group);
            old[1].dispose();
            ghosts.delete(old[0]);
          }
        }
        g = make(m, now);
        ghosts.set(m.name, g);
        return;
      }
      g.from = { x: g.group.position.x, z: g.group.position.z };
      g.to = toWorld(m);
      g.t0 = now;
      g.last = now;
    },
    tick: (now) => {
      for (const [name, g] of ghosts) {
        const k = opts.reduced ? 1 : Math.min(1, (now - g.t0) / GHOST_EVERY_MS);
        const x = g.from.x + (g.to.x - g.from.x) * k;
        const z = g.from.z + (g.to.z - g.from.z) * k;
        const bob = opts.reduced ? 0 : Math.sin(now / 400 + x) * 0.04;
        g.group.position.set(x, opts.heightAt(x, z) + 0.05 + bob, z);
        if (g.to.x !== g.from.x || g.to.z !== g.from.z)
          g.group.rotation.y = Math.atan2(g.to.x - g.from.x, g.to.z - g.from.z);
        const idle = now - g.last;
        const fade =
          idle < GHOST_FADE_MS
            ? 1
            : Math.max(0, 1 - (idle - GHOST_FADE_MS) / 1000);
        g.fade(fade);
        if (fade <= 0) {
          group.remove(g.group);
          g.dispose();
          ghosts.delete(name);
        }
      }
    },
    setVisible: (v) => {
      group.visible = v;
    },
    dispose: () => {
      for (const g of ghosts.values()) g.dispose();
      ghosts.clear();
      glow.dispose();
    },
  };
};
