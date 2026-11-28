// One island per biome from the real renderer (ADV-10.2): `?day=YYYY-MM-DD` picks the island, the
// explorer stands on the dock and the camera frames the whole isle. Built by tools/assets/biomes.py.
import { createIsland3D } from '../../../src/client/island/three/island3d.ts';
import { islandForDay } from '../../../src/shared/island.ts';
import { walkable } from '../../../src/shared/path.ts';

const day = new URLSearchParams(location.search).get('day') ?? '2026-12-05';
const zoom = Number(new URLSearchParams(location.search).get('zoom') ?? '1');
const island = islandForDay(day, 'clear');
const canvas = document.getElementById('c');
if (canvas instanceof HTMLCanvasElement) {
  const h = createIsland3D(canvas, {
    reducedMotion: false,
    adaptive: false,
    onFail: () => console.error('fail'),
  });
  const d = island.dock;
  let at = d;
  for (let y = d.y - 3; y < d.y; y++)
    if (walkable(island.terrain, d.x, y)) at = { x: d.x, y };
  h.update(
    {
      island,
      seen: null,
      sailor: at,
      footprints: [],
      holes: [],
      route: [],
      markers: [],
      link: false,
      highlight: null,
    },
    zoom,
    // Wide shots frame the whole isle; close ones stand on the dock.
    zoom < 0.6 ? { x: 20, y: 18 } : at
  );
  h.setHat('legend');
}
