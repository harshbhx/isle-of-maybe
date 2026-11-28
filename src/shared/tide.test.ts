import assert from 'node:assert/strict';
import { test } from 'node:test';
import { islandForDay } from './island.ts';
import {
  HUNT_SECONDS,
  coastDistance,
  flooded,
  tideAt,
  tideLevel,
} from './tide.ts';
import { GRASS, H, SAND, W, WATER, idx, inBounds } from './types.ts';

const island = islandForDay('2026-12-09', 'clear');

test('ADV-1.1 a hunt lasts 150 seconds', () => {
  assert.equal(HUNT_SECONDS, 150);
});

test('ADV-1.2 sand next to the sea is 1, inland sand counts up, other tiles never flood', () => {
  const d = coastDistance(island);
  let ones = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const code = island.terrain[idx(x, y)];
      const v = d[idx(x, y)] ?? 0;
      if (code !== SAND) {
        assert.equal(v, 0, `non-sand ${x},${y}`);
        continue;
      }
      const touchesSea = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(
        ([dx = 0, dy = 0]) =>
          !inBounds(x + dx, y + dy) ||
          island.terrain[idx(x + dx, y + dy)] === WATER
      );
      if (touchesSea) {
        assert.equal(v, 1);
        ones++;
      } else if (v > 0) {
        assert.ok(v >= 2);
      }
    }
  assert.ok(ones > 10, 'the island has a beach');
  const grass = island.terrain.indexOf(GRASS);
  assert.equal(d[grass], 0);
});

test('ADV-1.3 the tide rises to 1, 2 and 3 at 40, 65 and 85 percent', () => {
  assert.equal(tideLevel(0), 0);
  assert.equal(tideLevel(0.4 * HUNT_SECONDS - 0.01), 0);
  assert.equal(tideLevel(0.4 * HUNT_SECONDS), 1);
  assert.equal(tideLevel(0.65 * HUNT_SECONDS), 2);
  assert.equal(tideLevel(0.85 * HUNT_SECONDS), 3);
  assert.equal(tideLevel(HUNT_SECONDS * 2), 3);
  assert.equal(tideAt(2), 0.65 * HUNT_SECONDS);
  const d = coastDistance(island);
  const beach = d.indexOf(1);
  const tile = { x: beach % W, y: Math.floor(beach / W) };
  assert.equal(flooded(d, tile, 0), false);
  assert.equal(flooded(d, tile, 1), true);
});
