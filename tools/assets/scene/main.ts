// A standalone render of the real island and explorer for key art and the find GIF: the explorer
// celebrates as a chest bursts open, two ghosts nearby. Built by tools/assets/scene.py.
import { createIsland3D } from '../../../src/client/island/three/island3d.ts';
import { islandForDay } from '../../../src/shared/island.ts';
import { walkable } from '../../../src/shared/path.ts';
const island = islandForDay('2026-12-09', 'clear');
const canvas = document.getElementById('c') as HTMLCanvasElement;
const h = createIsland3D(canvas, {
  reducedMotion: false,
  adaptive: false,
  onFail: () => console.error('fail'),
});
h.update(
  {
    island,
    seen: null,
    sailor: island.dock,
    footprints: [],
    holes: [],
    route: [],
    markers: [],
    link: false,
    highlight: null,
  },
  1,
  island.dock
);
const d = island.dock;
let chest = d;
for (let y = d.y - 7; y < d.y - 2; y++)
  for (let x = d.x - 3; x <= d.x + 3; x++)
    if (walkable(island.terrain, x, y)) chest = { x, y };
h.drive({
  start: { x: chest.x - 1, y: chest.y + 1 },
  blocked: (x, y) => !walkable(island.terrain, x, y),
  ground: () => 'open',
  onStep: () => {},
});
h.setHat('legend');
setTimeout(() => {
  h.ghost({ name: 'kelpie', x: chest.x - 4, y: chest.y - 2, tier: 'mapmaker' });
  h.ghost({
    name: 'saltwhisker',
    x: chest.x + 3,
    y: chest.y - 3,
    tier: 'cartographer',
  });
  void h.cinematic({
    kind: 'found',
    chest,
    label: 'Buried by u/marlin',
    stamp: 'true',
    font: 'Georgia, serif',
  });
}, 900);
