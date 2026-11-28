// Sky, sun and horizon (ADV-4.1): a gradient dome with a soft sun, a calm far sea that runs to
// the horizon under the haze, and a few slow clouds high up. Colours follow the time of day.
import {
  BackSide,
  Color,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { hash32 } from '../../../../shared/rng.ts';

export type SkyLook = {
  zenith: Color;
  horizon: Color;
  sun: Color;
  sunDir: Vector3;
  sunPower: number;
  hemiSky: Color;
  hemiGround: Color;
  far: Color;
};

/**
 * Daytime by default; Lantern night is a warm dusk. The sun sits low in the west-south-west so
 * shadows read from the usual camera angle.
 */
export const skyLook = (lantern: boolean): SkyLook =>
  lantern
    ? {
        zenith: new Color(0x26345f),
        horizon: new Color(0xf2a36b),
        sun: new Color(0xffb27a),
        sunDir: new Vector3(-0.8, 0.32, 0.45).normalize(),
        sunPower: 2.1,
        hemiSky: new Color(0x9aa7d6),
        hemiGround: new Color(0x5a3c2a),
        far: new Color(0x2e5d73),
      }
    : {
        zenith: new Color(0x3d9fd6),
        horizon: new Color(0xd8f0ef),
        sun: new Color(0xfff1d0),
        sunDir: new Vector3(-0.55, 0.72, 0.42).normalize(),
        sunPower: 3.0,
        hemiSky: new Color(0xcfeefc),
        hemiGround: new Color(0x8a7a52),
        far: new Color(0x2a8e9b),
      };

export const createSky = (
  look: SkyLook,
  seed: string,
  clouds: number
): { group: Group; tick: (t: number) => void } => {
  const group = new Group();
  const dome = new Mesh(
    new SphereGeometry(300, 32, 16),
    new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: look.zenith },
        uHorizon: { value: look.horizon },
        uSun: { value: look.sun },
        uSunDir: { value: look.sunDir },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir;
        varying vec3 vDir;
        void main() {
          float up = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uZenith, pow(up, 0.55));
          float s = max(dot(normalize(vDir), uSunDir), 0.0);
          col += uSun * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.25);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    })
  );
  dome.renderOrder = -1;
  group.add(dome);

  // Calm far sea under the haze, so the horizon is water, not sky.
  const far = new Mesh(
    new PlaneGeometry(900, 900),
    new MeshBasicMaterial({ color: look.far })
  );
  far.rotation.x = -Math.PI / 2;
  far.position.y = -0.4;
  group.add(far);

  // High clouds drifting slowly: a few puffy instanced blobs.
  const puff = new IcosahedronGeometry(1, 2);
  const mesh = new InstancedMesh(
    puff,
    new MeshLambertMaterial({
      color: 0xffffff,
      emissive: 0x9fb2b8,
      fog: false,
    }),
    clouds * 5
  );
  const base: { x: number; y: number; z: number; s: number }[] = [];
  const h = hash32(`${seed}:sky`);
  for (let c = 0; c < clouds; c++) {
    const a = ((h % 997) / 997 + c / clouds) * Math.PI * 2;
    const r = 70 + ((h >>> (c % 16)) % 40);
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    const cy = 26 + ((h >>> ((c + 3) % 16)) % 12);
    for (let p = 0; p < 5; p++)
      base.push({
        x: cx + (p - 2) * 3.2,
        y: cy + ((p * 7) % 3) * 0.8,
        z: cz + ((p * 5) % 3) * 1.4,
        s: 3.2 + ((p * 3) % 4) * 0.7,
      });
  }
  const tmp = new Object3D();
  const place = (t: number): void => {
    base.forEach((b, i) => {
      tmp.position.set(b.x + Math.sin(t * 0.01 + i) * 2 + t * 0.15, b.y, b.z);
      tmp.position.x = ((tmp.position.x + 140) % 280) - 140;
      tmp.scale.set(b.s * 1.4, b.s * 0.6, b.s);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  place(0);
  if (clouds > 0) group.add(mesh);
  return { group, tick: (t) => place(t) };
};
