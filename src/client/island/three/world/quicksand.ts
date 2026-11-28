// Quicksand on the 3D island (ADV-2.1, ADV-4.1): dark, wet patches that ripple and bubble, so a
// careful explorer can see them coming; a map-follower in a hurry may not.
import { CircleGeometry, InstancedMesh, Object3D, ShaderMaterial } from 'three';
import { toWorld } from '../../../../shared/relief.ts';
import { W } from '../../../../shared/types.ts';
import type { Heights } from './heights.ts';

export const createQuicksand = (
  tiles: ReadonlySet<number>,
  heights: Heights
): { mesh: InstancedMesh | null; tick: (t: number) => void } => {
  if (tiles.size === 0) return { mesh: null, tick: () => undefined };
  const time = { value: 0 };
  const geo = new CircleGeometry(0.62, 24);
  geo.rotateX(-Math.PI / 2);
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    uniforms: { uTime: time },
    vertexShader: /* glsl */ `
      varying vec2 vP; varying vec2 vSeed;
      void main() {
        vP = position.xz / 0.62;
        vSeed = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vP; varying vec2 vSeed;
      void main() {
        float r = length(vP);
        float edge = 1.0 - smoothstep(0.75, 1.0, r);
        float ripple = 0.5 + 0.5 * sin(r * 18.0 - uTime * 2.2 + vSeed.x);
        float bubble = step(0.985, fract(sin(dot(floor(vP * 7.0 + vSeed), vec2(12.9, 78.2))) * 43758.5 + uTime * 0.25));
        vec3 col = mix(vec3(0.42, 0.33, 0.2), vec3(0.55, 0.45, 0.28), ripple * 0.5);
        col = mix(col, vec3(0.7, 0.62, 0.45), bubble);
        gl_FragColor = vec4(col, edge * 0.92);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new InstancedMesh(geo, mat, tiles.size);
  const tmp = new Object3D();
  let n = 0;
  for (const i of tiles) {
    const x = i % W;
    const y = (i - x) / W;
    const w = toWorld({ x, y });
    tmp.position.set(w.x, heights.at(w.x, w.z) + 0.015, w.z);
    tmp.rotation.set(0, (i * 1.7) % 6, 0);
    tmp.scale.setScalar(0.9 + (i % 3) * 0.08);
    tmp.updateMatrix();
    mesh.setMatrixAt(n++, tmp.matrix);
  }
  mesh.renderOrder = 1;
  return { mesh, tick: (t) => (time.value = t) };
};
