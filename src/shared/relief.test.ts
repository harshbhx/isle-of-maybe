// The 3D view's relief rules (UI-3.1, UI-3.6): kinds match the 2D renderer, heights order sensibly,
// taps map back to the right tile, clouds cover the land, and unseen landmarks never show.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateIsland } from './island.ts';
import {
  cloudAt,
  cloudTiles,
  landmarkVisible,
  TOP,
  tileKind,
  tileTop,
  tilesAcross,
  toTile,
  toWorld,
} from './relief.ts';
import { H, LANDMARK, ROCK, SAND, W, WATER, idx } from './types.ts';

const island = generateIsland('maybe-2026-12-09', 'clear');
const mask = (tiles: number[]): Uint8Array => {
  const m = new Uint8Array((W * H) / 8);
  for (const i of tiles) m[i >> 3] = (m[i >> 3] ?? 0) | (1 << (i & 7));
  return m;
};

test('UI-3.1 every tile gets a kind consistent with its terrain code', () => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const code = island.terrain[idx(x, y)];
      const k = tileKind(island, x, y);
      if (code === WATER) assert.equal(k, 'water');
      else if (code === SAND) assert.equal(k, 'sand');
      else if (code === ROCK) assert.ok(['rock', 'jungle', 'pond'].includes(k));
      else if (code === LANDMARK) assert.equal(k, 'grass');
    }
});

test('UI-3.1 sand sits below grass and blocked tiles stand tallest (ponds sink)', () => {
  assert.ok(
    TOP.sand < TOP.grass && TOP.grass < TOP.jungle && TOP.jungle <= TOP.rock
  );
  assert.ok(TOP.pond < TOP.sand);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (tileKind(island, x, y) !== 'grass') continue;
      const t = tileTop(island, x, y);
      assert.ok(t >= TOP.grass && t < TOP.jungle, `grass at ${x},${y} is ${t}`);
    }
});

test('UI-3.1 Thick jungle turns every blocked tile into jungle', () => {
  const j = generateIsland('maybe-2026-12-10', 'jungle');
  for (let i = 0; i < W * H; i++)
    if (j.terrain[i] === ROCK)
      assert.equal(tileKind(j, i % W, Math.floor(i / W)), 'jungle');
});

test('UI-3.6 a tap on a tile centre maps back to that tile; off the grid is nothing', () => {
  for (const t of [
    { x: 0, y: 0 },
    { x: 19, y: 37 },
    { x: 39, y: 39 },
    { x: 7, y: 22 },
  ]) {
    const w = toWorld(t);
    assert.deepEqual(toTile(w.x, w.z), t);
    assert.deepEqual(toTile(w.x + 0.45, w.z - 0.45), t);
  }
  assert.equal(toTile(-W, 0), null);
  assert.equal(toTile(0, H), null);
});

test('UI-3.1 low cloud covers every land tile and the water touching it, not the open sea', () => {
  const c = new Set(cloudTiles(island));
  for (let i = 0; i < W * H; i++)
    if (island.terrain[i] !== WATER) assert.ok(c.has(i));
  assert.ok(!c.has(idx(0, 0)), 'the corner is open sea');
});

test('UI-3.1 clouds clear on seen tiles and thin out next to them', () => {
  const at = idx(island.dock.x, island.dock.y - 1);
  const seen = mask([at]);
  assert.equal(cloudAt(seen, at), 'none');
  assert.equal(cloudAt(seen, at - 1), 'thin');
  assert.equal(cloudAt(seen, idx(1, 1)), 'full');
  assert.equal(cloudAt(null, idx(1, 1)), 'none');
});

test('UI-3.6 an unseen landmark is hidden in 3D, except within lantern range on Lantern night', () => {
  const l = island.landmarks[0];
  assert.ok(l !== undefined);
  const none = new Uint8Array((W * H) / 8);
  assert.equal(
    landmarkVisible(island, none, { x: l.at.x, y: l.at.y + 1 }, l.at),
    'hidden'
  );
  assert.equal(
    landmarkVisible(island, mask([idx(l.at.x, l.at.y)]), null, l.at),
    'shown'
  );
  assert.equal(landmarkVisible(island, null, null, l.at), 'shown');
  const lit = generateIsland('maybe-2026-12-12', 'lanterns');
  const m = lit.landmarks[0];
  assert.ok(m !== undefined);
  assert.equal(
    landmarkVisible(lit, none, { x: m.at.x + 3, y: m.at.y }, m.at),
    'lantern'
  );
  assert.equal(
    landmarkVisible(lit, none, { x: m.at.x + 7, y: m.at.y }, m.at),
    'hidden'
  );
  assert.equal(landmarkVisible(lit, none, null, m.at), 'hidden');
});

test('UI-3.1 zoom steps frame the whole island, then come in close', () => {
  assert.ok(tilesAcross(0) > W);
  assert.equal(tilesAcross(1), 13);
  assert.ok(
    tilesAcross(2) < tilesAcross(1.5) && tilesAcross(1.5) < tilesAcross(1)
  );
});
