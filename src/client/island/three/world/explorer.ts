// The explorer (ADV-3.1, ADV-3.4): an original treasure hunter built from simple shapes (wide-brim
// hat, scarf, satchel, rolled sleeves, boots, a shovel on the back) with code-driven animation for
// idle, walk, run, dig, stuck, celebrate and dejected. No external assets.
import {
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
  BoxGeometry,
  TorusGeometry,
} from 'three';

export type Pose =
  'idle' | 'walk' | 'run' | 'dig' | 'stuck' | 'celebrate' | 'dejected';

const mat = (color: number): MeshLambertMaterial =>
  new MeshLambertMaterial({ color });

const C = {
  skin: 0xe8b48a,
  shirt: 0xf3e6c8,
  vest: 0x2f6f73,
  trousers: 0x6b4f35,
  boots: 0x3a2618,
  hat: 0xc9935a,
  band: 0xb8233f,
  scarf: 0xffb21e,
  satchel: 0x8a5a2b,
  wood: 0x8a6a44,
  steel: 0xb9c3c9,
  hair: 0x2b1d12,
};

const part = (
  geo: ConstructorParameters<typeof Mesh>[0],
  color: number
): Mesh => {
  const m = new Mesh(geo, mat(color));
  m.castShadow = true;
  return m;
};

export type Explorer = {
  root: Group;
  /** Advance the animation; `speed` is tiles per second, used for stride. */
  animate: (dt: number, pose: Pose, speed: number) => void;
};

export const createExplorer = (): Explorer => {
  const root = new Group();
  const body = new Group(); // bobs and leans
  root.add(body);

  // Legs: pivot at the hip.
  const leg = (side: 1 | -1): Group => {
    const g = new Group();
    g.position.set(0.075 * side, 0.42, 0);
    const thigh = part(new CapsuleGeometry(0.055, 0.2, 4, 8), C.trousers);
    thigh.position.y = -0.14;
    const boot = part(new BoxGeometry(0.1, 0.09, 0.17), C.boots);
    boot.position.set(0, -0.36, 0.03);
    const shin = part(new CapsuleGeometry(0.05, 0.14, 4, 8), C.trousers);
    shin.position.y = -0.3;
    g.add(thigh, shin, boot);
    body.add(g);
    return g;
  };
  const legL = leg(-1);
  const legR = leg(1);

  const torso = new Group();
  torso.position.y = 0.44;
  body.add(torso);
  const chest = part(new CapsuleGeometry(0.13, 0.2, 4, 10), C.shirt);
  chest.position.y = 0.18;
  chest.scale.set(1, 1, 0.8);
  const vest = part(
    new CylinderGeometry(0.138, 0.125, 0.24, 10, 1, true),
    C.vest
  );
  vest.position.y = 0.19;
  vest.scale.set(1, 1, 0.82);
  const belt = part(new TorusGeometry(0.12, 0.02, 6, 14), C.boots);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.06;
  const scarf = part(new TorusGeometry(0.075, 0.03, 6, 12), C.scarf);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 0.37;
  const tail = part(new BoxGeometry(0.05, 0.14, 0.02), C.scarf);
  tail.position.set(0.05, 0.3, -0.09);
  tail.rotation.z = 0.3;
  torso.add(chest, vest, belt, scarf, tail);

  // Satchel on a strap across the chest.
  const strap = part(new TorusGeometry(0.17, 0.012, 4, 20), C.satchel);
  strap.position.set(0, 0.2, 0);
  strap.rotation.set(0, Math.PI / 2, 0.75);
  const bag = part(new BoxGeometry(0.16, 0.13, 0.07), C.satchel);
  bag.position.set(0.15, 0.06, 0.06);
  torso.add(strap, bag);

  // Shovel on the back (swaps to the hands when digging).
  const shovel = new Group();
  const haft = part(new CylinderGeometry(0.014, 0.014, 0.62, 6), C.wood);
  const blade = part(new ConeGeometry(0.07, 0.15, 4), C.steel);
  blade.position.y = -0.36;
  blade.rotation.set(Math.PI, Math.PI / 4, 0);
  blade.scale.set(1, 1, 0.35);
  const grip = part(new BoxGeometry(0.1, 0.025, 0.025), C.wood);
  grip.position.y = 0.31;
  shovel.add(haft, blade, grip);
  const onBack = (): void => {
    torso.add(shovel);
    shovel.position.set(-0.03, 0.2, -0.13);
    shovel.rotation.set(0, 0, 0.55);
  };
  onBack();

  // Arms: pivot at the shoulder; the forearm is skin (rolled sleeves).
  const arm = (side: 1 | -1): Group => {
    const g = new Group();
    g.position.set(0.17 * side, 0.32, 0);
    const upper = part(new CapsuleGeometry(0.042, 0.12, 4, 8), C.shirt);
    upper.position.y = -0.08;
    const fore = part(new CapsuleGeometry(0.036, 0.12, 4, 8), C.skin);
    fore.position.y = -0.22;
    const hand = part(new SphereGeometry(0.04, 8, 6), C.skin);
    hand.position.y = -0.31;
    g.add(upper, fore, hand);
    torso.add(g);
    return g;
  };
  const armL = arm(-1);
  const armR = arm(1);

  // Head, hair and the wide-brim hat.
  const head = new Group();
  head.position.y = 0.5;
  torso.add(head);
  const face = part(new SphereGeometry(0.105, 14, 10), C.skin);
  const hair = part(
    new SphereGeometry(0.108, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    C.hair
  );
  hair.rotation.x = -0.35;
  hair.position.set(0, 0.01, -0.015);
  const eyeL = part(new SphereGeometry(0.014, 6, 4), 0x1c140c);
  eyeL.position.set(-0.038, 0.01, 0.095);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.038;
  const nose = part(new SphereGeometry(0.02, 6, 4), 0xd99c74);
  nose.position.set(0, -0.015, 0.105);
  const brim = part(new CylinderGeometry(0.21, 0.22, 0.02, 20), C.hat);
  brim.position.y = 0.08;
  const crown = part(new CylinderGeometry(0.1, 0.12, 0.12, 14), C.hat);
  crown.position.y = 0.15;
  const dent = part(
    new SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    C.hat
  );
  dent.position.y = 0.2;
  dent.scale.set(1, 0.35, 1.05);
  const band = part(
    new CylinderGeometry(0.122, 0.122, 0.03, 14, 1, true),
    C.band
  );
  band.position.y = 0.11;
  head.add(face, hair, eyeL, eyeR, nose, brim, crown, dent, band);

  let phase = 0;
  let t = 0;
  let digging = false;
  const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

  const animate: Explorer['animate'] = (dt, pose, speed) => {
    t += dt;
    const k = Math.min(1, dt * 12);
    if ((pose === 'dig') !== digging) {
      digging = pose === 'dig';
      if (digging) {
        root.add(shovel);
      } else onBack();
    }
    let legSwing = 0;
    let armSwing = 0;
    let bob = 0;
    let lean = 0;
    let sink = 0;
    let headTilt = 0;
    let armsUp = 0;
    if (pose === 'walk' || pose === 'run') {
      phase += dt * (3.2 + speed * 2.2);
      const amp = pose === 'run' ? 0.95 : 0.6;
      legSwing = Math.sin(phase) * amp;
      armSwing = -Math.sin(phase) * amp * 0.9;
      bob = Math.abs(Math.cos(phase)) * (pose === 'run' ? 0.05 : 0.025);
      lean = pose === 'run' ? 0.22 : 0.08;
    } else if (pose === 'idle') {
      bob = Math.sin(t * 2) * 0.006;
      armSwing = Math.sin(t * 2) * 0.04;
    } else if (pose === 'dig') {
      // Drive the blade in, lever, throw: one stroke every 0.55 s.
      const s = (t % 0.55) / 0.55;
      lean = 0.35 + Math.sin(s * Math.PI * 2) * 0.18;
      armSwing = -0.9 + Math.sin(s * Math.PI * 2) * 0.5;
      bob = -0.04;
    } else if (pose === 'stuck') {
      sink = 0.22 + Math.sin(t * 3) * 0.02;
      armsUp = 1.9 + Math.sin(t * 9) * 0.5;
      lean = Math.sin(t * 5) * 0.12;
    } else if (pose === 'celebrate') {
      bob = Math.abs(Math.sin(t * 6)) * 0.22;
      armsUp = 2.7 + Math.sin(t * 12) * 0.2;
      headTilt = -0.25;
    } else if (pose === 'dejected') {
      headTilt = 0.45;
      lean = 0.2;
      armSwing = 0.08;
    }
    legL.rotation.x = lerp(legL.rotation.x, legSwing, k);
    legR.rotation.x = lerp(legR.rotation.x, -legSwing, k);
    if (armsUp > 0) {
      armL.rotation.x = lerp(armL.rotation.x, -armsUp, k);
      armR.rotation.x = lerp(
        armR.rotation.x,
        -armsUp + (pose === 'stuck' ? 0.6 : 0),
        k
      );
      armL.rotation.z = lerp(armL.rotation.z, -0.35, k);
      armR.rotation.z = lerp(armR.rotation.z, 0.35, k);
    } else {
      armL.rotation.x = lerp(armL.rotation.x, armSwing, k);
      armR.rotation.x = lerp(
        armR.rotation.x,
        pose === 'dig' ? armSwing : -armSwing,
        k
      );
      armL.rotation.z = lerp(armL.rotation.z, pose === 'dig' ? 0.25 : -0.06, k);
      armR.rotation.z = lerp(armR.rotation.z, pose === 'dig' ? -0.25 : 0.06, k);
    }
    body.position.y = lerp(body.position.y, bob - sink, k);
    torso.rotation.x = lerp(torso.rotation.x, lean, k);
    head.rotation.x = lerp(head.rotation.x, headTilt, k);
    if (digging) {
      // The shovel sits in both hands, blade down in front.
      const s = (t % 0.55) / 0.55;
      shovel.position.set(0, 0.5 + Math.sin(s * Math.PI * 2) * 0.08, 0.32);
      shovel.rotation.set(0.5 + Math.sin(s * Math.PI * 2) * 0.35, 0, 0);
    }
  };
  return { root, animate };
};
