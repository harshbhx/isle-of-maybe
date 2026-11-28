// For gallery capture only: the Old Captain's three chests on a day and arrow-key walks to them from
// the dock, so a scripted playthrough can find a real chest. Never shipped; the chest stays server-side
// in the game (this recomputes it from the seed, exactly as the daily job does).
//   node --experimental-strip-types tools/assets/captain-route.ts <seed> <modifier>
import { captainChests } from '../../src/shared/captain.ts';
import { IMPLEMENTED_MODIFIERS } from '../../src/shared/day.ts';
import { generateIsland } from '../../src/shared/island.ts';
import { aStar, walkable } from '../../src/shared/path.ts';
import { rngFor } from '../../src/shared/rng.ts';
import { H, W, type Tile } from '../../src/shared/types.ts';

const [seed = '', mod = 'clear'] = process.argv.slice(2);
const modifier = [...IMPLEMENTED_MODIFIERS].find((m) => m === mod) ?? 'clear';
const island = generateIsland(seed, modifier);
const chests = captainChests(island, rngFor(`${seed}|captain`));
const key = (a: Tile, b: Tile): string =>
  b.x > a.x ? 'ArrowRight' : b.x < a.x ? 'ArrowLeft' : b.y > a.y ? 'ArrowDown' : 'ArrowUp';
let at: Tile = island.dock;
const legs = chests.map((c) => {
  const p = aStar(island.terrain, at, c.at) ?? [at];
  at = c.at;
  return p.slice(1).map((t, i) => key(p[i] ?? t, t));
});
const walk: number[] = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) walk.push(walkable(island.terrain, x, y) ? 1 : 0);
console.log(JSON.stringify({ dock: island.dock, chests, legs, landmarks: island.landmarks, walk }));
