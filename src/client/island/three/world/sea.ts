// The sea (ADV-4.1, ADV-4.2): a wave shader over the sea floor. Colour comes from the water's real
// depth (read from the height field), with foam where it meets the sand, a sun glint, and a level
// that rises with the tide.
import {
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  DoubleSide,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  RedFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector3,
} from 'three';
import { ORIGIN, SAMPLES, STEP, type Heights } from './heights.ts';

export type Sea = {
  mesh: Mesh;
  /** Seconds, for the waves. */
  tick: (t: number) => void;
  setLevel: (level: number) => void;
  level: () => number;
  setFog: (color: Color, near: number, far: number) => void;
};

const vertex = /* glsl */ `
uniform float uTime;
uniform float uLevel;
uniform float uCalm;
uniform sampler2D uHeight;
uniform vec2 uHMap; // min, range
uniform vec2 uGrid; // origin, extent
varying vec3 vWorld;
varying vec3 vNormal;
varying float vGround;
varying float vCrest;

float groundAt(vec2 p) {
  vec2 uv = (p - vec2(uGrid.x)) / uGrid.y;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return -3.0;
  return uHMap.x + texture2D(uHeight, uv).r * uHMap.y;
}

void main() {
  vec3 p = position;
  float ground = groundAt(p.xz);
  float depth = clamp(uLevel - ground, 0.0, 3.0);
  // Waves shrink as the water shallows, and stop under reduced motion.
  float amp = (0.025 + 0.06 * smoothstep(0.0, 2.5, depth)) * uCalm;
  vec2 d1 = normalize(vec2(1.0, 0.35));
  vec2 d2 = normalize(vec2(-0.45, 1.0));
  vec2 d3 = normalize(vec2(0.8, -0.9));
  float t = uTime;
  float w1 = dot(d1, p.xz) * 0.9 + t * 1.1;
  float w2 = dot(d2, p.xz) * 1.6 + t * 1.7;
  float w3 = dot(d3, p.xz) * 2.7 + t * 2.3;
  float h = sin(w1) * 1.0 + sin(w2) * 0.55 + sin(w3) * 0.25;
  float dx = cos(w1) * 0.9 * d1.x + cos(w2) * 0.55 * 1.6 * d2.x + cos(w3) * 0.25 * 2.7 * d3.x;
  float dz = cos(w1) * 0.9 * d1.y + cos(w2) * 0.55 * 1.6 * d2.y + cos(w3) * 0.25 * 2.7 * d3.y;
  p.y = uLevel + h * amp;
  vNormal = normalize(vec3(-dx * amp, 1.0, -dz * amp));
  vCrest = h;
  vGround = ground;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragment = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uShallow;
uniform vec3 uFoam;
uniform vec3 uSky;
uniform vec3 uSunDir;
uniform vec3 uFogColor;
uniform vec2 uFog;
uniform sampler2D uHeight;
uniform vec2 uHMap;
uniform vec2 uGrid;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vGround;
varying float vCrest;

float groundAt(vec2 p) {
  vec2 uv = (p - vec2(uGrid.x)) / uGrid.y;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return -3.0;
  return uHMap.x + texture2D(uHeight, uv).r * uHMap.y;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  float depth = vWorld.y - groundAt(vWorld.xz);
  if (depth < -0.02) discard;
  vec3 n = normalize(vNormal);
  vec3 view = normalize(cameraPosition - vWorld);
  vec3 col = mix(uShallow, uMid, smoothstep(0.02, 0.5, depth));
  col = mix(col, uDeep, smoothstep(0.5, 2.4, depth));
  // Caustic shimmer in the shallows.
  float caustic = vnoise(vWorld.xz * 3.0 + uTime * 0.6) * vnoise(vWorld.xz * 2.3 - uTime * 0.45);
  col += vec3(0.16, 0.2, 0.17) * caustic * (1.0 - smoothstep(0.0, 0.7, depth));
  // Sky reflection at grazing angles, and the sun's glint.
  float fres = pow(1.0 - max(dot(n, view), 0.0), 3.0);
  col = mix(col, uSky, fres * 0.55);
  vec3 h = normalize(uSunDir + view);
  col += vec3(1.0, 0.95, 0.8) * pow(max(dot(n, h), 0.0), 140.0) * 1.4;
  // Foam: a moving lace along the shore, and a little on the crests out at sea.
  float lace = vnoise(vWorld.xz * 4.0 + vec2(uTime * 0.4, -uTime * 0.3));
  float band = 1.0 - smoothstep(0.0, 0.1, depth);
  float surge = 0.5 + 0.5 * sin(depth * 55.0 - uTime * 2.6);
  float foam = band * smoothstep(0.35, 0.75, lace * 0.6 + surge * 0.5);
  foam += smoothstep(1.45, 1.75, vCrest) * smoothstep(0.4, 0.8, lace) * 0.6;
  col = mix(col, uFoam, clamp(foam, 0.0, 1.0));
  float alpha = mix(0.45, 0.94, smoothstep(0.0, 0.45, depth));
  alpha = max(alpha, clamp(foam, 0.0, 1.0));
  float dist = length(cameraPosition - vWorld);
  col = mix(col, uFogColor, smoothstep(uFog.x, uFog.y, dist));
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`;

export const createSea = (
  heights: Heights,
  opts: {
    size: number;
    segments: number;
    calm: boolean;
    sunDir: Vector3;
    /** The day's biome water (ADV-10.2); tropical when absent. */
    colors?: { deep: number; mid: number; shallow: number };
  }
): Sea => {
  const n = SAMPLES;
  const bytes = new Uint8Array(n * n);
  const range = Math.max(0.001, heights.max - heights.min);
  for (let i = 0; i < n * n; i++)
    bytes[i] = Math.round(
      (((heights.data[i] ?? 0) - heights.min) / range) * 255
    );
  const tex = new DataTexture(bytes, n, n, RedFormat, UnsignedByteType);
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.needsUpdate = true;
  const linear = (hex: number): Color => new Color(hex);
  const uniforms = {
    uTime: { value: 0 },
    uLevel: { value: 0.12 },
    uCalm: { value: opts.calm ? 0.15 : 1 },
    uHeight: { value: tex },
    uHMap: { value: [heights.min, range] },
    uGrid: { value: [ORIGIN, (n - 1) * STEP] },
    uDeep: { value: linear(opts.colors?.deep ?? 0x0b4f63) },
    uMid: { value: linear(opts.colors?.mid ?? 0x138f97) },
    uShallow: { value: linear(opts.colors?.shallow ?? 0x5fd6c6) },
    uFoam: { value: linear(0xfffaf0) },
    uSky: { value: linear(0xbfe6f2) },
    uSunDir: { value: opts.sunDir.clone().normalize() },
    uFogColor: { value: linear(0xcdeaf0) },
    uFog: { value: [60, 140] },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  const geo = new PlaneGeometry(
    opts.size,
    opts.size,
    opts.segments,
    opts.segments
  );
  geo.rotateX(-Math.PI / 2);
  const mesh = new Mesh(geo, material);
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  return {
    mesh,
    tick: (t) => {
      uniforms.uTime.value = t;
    },
    setLevel: (level) => {
      uniforms.uLevel.value = level;
    },
    level: () => uniforms.uLevel.value,
    setFog: (color, near, far) => {
      uniforms.uFogColor.value = color;
      uniforms.uFog.value = [near, far];
    },
  };
};
