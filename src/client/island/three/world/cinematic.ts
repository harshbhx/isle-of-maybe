// The dig's big moment (ADV-5, ADV-6.2): the chest bursts out of the sand, the lid flies open on
// a fountain of gold and a shaft of light, and the camera swings round it. A miss shows the empty
// truth instead. The lid carries an engraved plaque: "Buried by u/name".
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';

export type Stamp = 'true' | 'cursed' | null;

/** The engraved plaque, drawn once on a small canvas (fonts are bundled, so nothing loads). */
const plaqueTexture = (
  label: string,
  stamp: Stamp,
  font: string
): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d');
  if (g !== null) {
    const grad = g.createLinearGradient(0, 0, 0, 160);
    grad.addColorStop(0, '#E9C77A');
    grad.addColorStop(1, '#B98A3E');
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(6, 6, 500, 148, 18);
    g.fill();
    g.strokeStyle = '#6B4A22';
    g.lineWidth = 6;
    g.stroke();
    g.fillStyle = '#3A2412';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let size = 46;
    g.font = `700 ${size}px ${font}`;
    while (
      g.measureText(label).width > (stamp === null ? 440 : 330) &&
      size > 18
    ) {
      size -= 2;
      g.font = `700 ${size}px ${font}`;
    }
    g.fillText(label, stamp === null ? 256 : 210, 82);
    if (stamp !== null) {
      g.save();
      g.translate(430, 80);
      g.rotate(-0.25);
      g.strokeStyle = stamp === 'true' ? '#1E5B3A' : '#B8233F';
      g.fillStyle = g.strokeStyle;
      g.lineWidth = 5;
      g.beginPath();
      g.arc(0, 0, 54, 0, Math.PI * 2);
      g.stroke();
      g.font = `800 ${stamp === 'true' ? 30 : 24}px ${font}`;
      g.fillText(stamp === 'true' ? 'TRUE' : 'CURSED', 0, 2);
      g.restore();
    }
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
};

export type Cinematic = {
  group: Group;
  /** Advance; returns false once finished. */
  tick: (age: number) => boolean;
  dispose: () => void;
};

const lam = (color: number, emissive = 0): MeshLambertMaterial =>
  new MeshLambertMaterial({ color, emissive });

export const createCinematic = (opts: {
  kind: 'found' | 'missed' | 'tide';
  at: Vector3;
  label: string;
  stamp: Stamp;
  font: string;
  reduced: boolean;
}): Cinematic => {
  const group = new Group();
  group.position.copy(opts.at);
  const found = opts.kind === 'found';

  // The chest: banded wood, a lid on a hinge, gold inside, the plaque on the front.
  const chest = new Group();
  const base = new Mesh(new BoxGeometry(0.72, 0.4, 0.5), lam(0x7a4e26));
  base.position.y = 0.2;
  const bandA = new Mesh(new BoxGeometry(0.74, 0.06, 0.52), lam(0x3a2a1a));
  bandA.position.y = 0.33;
  const bandB = bandA.clone();
  bandB.position.y = 0.08;
  const lock = new Mesh(
    new BoxGeometry(0.1, 0.12, 0.04),
    lam(0xffb21e, 0x553300)
  );
  lock.position.set(0, 0.36, 0.27);
  const lid = new Group();
  const lidMesh = new Mesh(
    new CylinderGeometry(0.25, 0.25, 0.72, 12, 1, false, 0, Math.PI),
    lam(0x8a5a2b)
  );
  lidMesh.rotation.z = Math.PI / 2;
  lidMesh.position.z = 0.25;
  lid.add(lidMesh);
  lid.position.set(0, 0.4, -0.25);
  const plaque = new Mesh(
    new PlaneGeometry(0.62, 0.19),
    new MeshBasicMaterial({
      map: plaqueTexture(opts.label, opts.stamp, opts.font),
    })
  );
  plaque.position.set(0, 0.2, 0.252);
  const gold = new Mesh(
    new SphereGeometry(0.3, 12, 8),
    lam(0xffc83d, 0x8a5a00)
  );
  gold.scale.set(1.1, 0.45, 0.75);
  gold.position.y = 0.4;
  gold.visible = found;
  chest.add(base, bandA, bandB, lock, lid, plaque, gold);
  chest.traverse((o) => {
    o.castShadow = true;
  });
  group.add(chest);

  // A hole the chest comes out of.
  const hole = new Mesh(
    new CylinderGeometry(0.55, 0.4, 0.06, 18),
    lam(0x3a2a1a)
  );
  hole.position.y = 0.01;
  group.add(hole);

  // Light shaft and coins (found only).
  const shaftMat = new MeshBasicMaterial({
    color: 0xffe7a3,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const shaft = new Mesh(new ConeGeometry(0.9, 6, 20, 1, true), shaftMat);
  shaft.position.y = 3;
  shaft.rotation.x = Math.PI;
  group.add(shaft);
  const COINS = found && !opts.reduced ? 70 : 0;
  const coins = new InstancedMesh(
    new CylinderGeometry(0.06, 0.06, 0.015, 10),
    lam(0xffc83d, 0x7a5000),
    Math.max(1, COINS)
  );
  coins.count = 0;
  group.add(coins);
  const vel: Vector3[] = [];
  for (let i = 0; i < COINS; i++) {
    const a = (i / COINS) * Math.PI * 2 * 3.1;
    const up = 3 + ((i * 37) % 10) * 0.25;
    const out = 0.6 + ((i * 13) % 7) * 0.15;
    vel.push(new Vector3(Math.cos(a) * out, up, Math.sin(a) * out));
  }
  const tmp = new Object3D();
  const DUR = opts.reduced ? 1.2 : found ? 3.4 : 2.4;

  const tick = (age: number): boolean => {
    if (opts.reduced) {
      chest.position.y = 0;
      lid.rotation.x = found ? -1.9 : 0;
      chest.visible = true;
      shaftMat.opacity = found ? 0.35 : 0;
      return age < DUR;
    }
    // Rise out of the sand with a shudder.
    const rise = Math.min(1, age / 0.6);
    chest.position.y = -0.55 * (1 - rise) ** 2;
    chest.rotation.z = rise < 1 ? Math.sin(age * 40) * 0.04 : 0;
    chest.visible = true;
    if (!found) {
      // Missed: the chest stays shut, a little sunk, the plaque still saying whose it was.
      chest.position.y -= 0.12;
      return age < DUR;
    }
    const open = Math.max(0, Math.min(1, (age - 0.6) / 0.35));
    lid.rotation.x = -1.95 * (1 - (1 - open) ** 3);
    shaftMat.opacity =
      Math.max(0, Math.min(0.45, (age - 0.65) * 1.2)) *
      Math.max(0, Math.min(1, (DUR - age) / 0.8));
    // Coins: a fountain under gravity, spinning, landing in a ring.
    const ct = age - 0.75;
    if (ct > 0) {
      coins.count = COINS;
      vel.forEach((v, i) => {
        const t = Math.min(ct, 1.6);
        const y = Math.max(0.02, 0.4 + v.y * t - 4.9 * t * t);
        tmp.position.set(v.x * t, y, v.z * t);
        tmp.rotation.set(ct * (6 + (i % 5)), ct * 3 + i, 0);
        tmp.updateMatrix();
        coins.setMatrixAt(i, tmp.matrix);
      });
      coins.instanceMatrix.needsUpdate = true;
    }
    return age < DUR;
  };
  tick(0);
  return {
    group,
    tick,
    dispose: () => {
      group.traverse((o) => {
        if (o instanceof Mesh || o instanceof InstancedMesh) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else {
            if (m instanceof MeshBasicMaterial) m.map?.dispose();
            m.dispose();
          }
        }
      });
    },
  };
};
