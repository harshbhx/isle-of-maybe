// Low mist over the land you haven't seen (UI-3.6, ADV-4.1): a few soft, drifting layers drawn
// from a blurred mask of the seen tiles, so it parts smoothly around the explorer.
import {
  ClampToEdgeWrapping,
  DataTexture,
  Group,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  RedFormat,
  ShaderMaterial,
  UnsignedByteType,
} from 'three';
import { cloudAt, cloudTiles } from '../../../../shared/relief.ts';
import { H, W, type Island } from '../../../../shared/types.ts';

const UP = 2; // mask texels per tile

export type Mist = {
  group: Group;
  setSeen: (seen: Uint8Array | null) => void;
  tick: (t: number) => void;
};

export const createMist = (island: Island, layers: number): Mist => {
  const tiles = cloudTiles(island);
  const n = W * UP;
  const m = H * UP;
  const bytes = new Uint8Array(n * m);
  const tex = new DataTexture(bytes, n, m, RedFormat, UnsignedByteType);
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  const time = { value: 0 };
  const group = new Group();
  const geo = new PlaneGeometry(W + 4, H + 4);
  geo.rotateX(-Math.PI / 2);
  for (let l = 0; l < layers; l++) {
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      uniforms: {
        uMask: { value: tex },
        uTime: time,
        uLayer: { value: l / Math.max(1, layers - 1) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vWorld;
        void main() {
          vUv = uv;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMask; uniform float uTime; uniform float uLayer;
        varying vec2 vUv; varying vec3 vWorld;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }
        void main() {
          // The plane is 2 tiles larger than the grid on each side.
          vec2 uv = (vUv * ${(W + 4).toFixed(1)} - 2.0) / ${W.toFixed(1)};
          uv.y = 1.0 - uv.y;
          float mask = texture2D(uMask, clamp(uv, 0.0, 1.0)).r;
          vec2 p = vWorld.xz * (0.32 + uLayer * 0.2) + vec2(uTime * 0.05, uTime * 0.03) * (1.0 + uLayer);
          float puff = vnoise(p) * 0.6 + vnoise(p * 2.3 + 7.0) * 0.4;
          float a = smoothstep(0.08, 0.75, mask) * (0.55 + 0.45 * puff);
          a *= mix(1.0, 0.85, uLayer);
          if (a < 0.01) discard;
          vec3 col = mix(vec3(0.82, 0.89, 0.9), vec3(1.0, 1.0, 0.99), puff * 0.7 + uLayer * 0.3);
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.y = 0.95 + l * 0.42;
    mesh.renderOrder = 3 + l;
    group.add(mesh);
  }

  const setSeen = (seen: Uint8Array | null): void => {
    // Tile values first, then upsample with a soft 3×3 blur.
    const tv = new Float32Array(W * H);
    for (const i of tiles) {
      const s = cloudAt(seen, i);
      tv[i] = s === 'full' ? 1 : s === 'thin' ? 0.45 : 0;
    }
    const tileAt = (x: number, y: number): number =>
      tv[
        Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))
      ] ?? 0;
    for (let y = 0; y < m; y++)
      for (let x = 0; x < n; x++) {
        const tx = (x + 0.5) / UP - 0.5;
        const ty = (y + 0.5) / UP - 0.5;
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            sum += tileAt(Math.round(tx + dx * 0.6), Math.round(ty + dy * 0.6));
        bytes[y * n + x] = Math.round((sum / 9) * 255);
      }
    tex.needsUpdate = true;
  };
  setSeen(null);
  return { group, setSeen, tick: (t) => (time.value = t) };
};
