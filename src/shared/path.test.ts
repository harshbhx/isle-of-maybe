import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  aStar,
  chebyshev,
  digFinds,
  isAdjacent4,
  manhattan,
  revealAround,
  walkable,
} from './path.ts';
import { GRASS, H, LANDMARK, ROCK, W, WATER, idx } from './types.ts';

const blank = (): Uint8Array => new Uint8Array(W * H).fill(GRASS);

test('ENG-3.1 A* finds a shortest 4-directional path', () => {
  const t = blank();
  const p = aStar(t, { x: 2, y: 2 }, { x: 6, y: 5 });
  assert.ok(p !== null);
  assert.equal(p.length - 1, manhattan({ x: 2, y: 2 }, { x: 6, y: 5 }));
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1];
    const b = p[i];
    assert.ok(a !== undefined && b !== undefined && isAdjacent4(a, b));
  }
});

test('ENG-3.1 / ENG-3.2 A* routes around rocks and water, null when walled off', () => {
  const t = blank();
  for (let y = 0; y < H; y++) if (y !== 30) t[idx(10, y)] = ROCK;
  const p = aStar(t, { x: 5, y: 5 }, { x: 15, y: 5 });
  assert.ok(p !== null);
  assert.ok(p.every((s) => walkable(t, s.x, s.y)));
  assert.ok(p.some((s) => s.x === 10 && s.y === 30));
  t[idx(10, 30)] = WATER;
  assert.equal(aStar(t, { x: 5, y: 5 }, { x: 15, y: 5 }), null);
});

test('ENG-3.2 landmarks and out-of-bounds are not walkable', () => {
  const t = blank();
  t[idx(4, 4)] = LANDMARK;
  assert.equal(walkable(t, 4, 4), false);
  assert.equal(walkable(t, 5, 4), true);
  assert.equal(walkable(t, -1, 0), false);
  assert.equal(walkable(t, W, 0), false);
});

test('ENG-3.3 reveal radius is Euclidean', () => {
  const r2 = revealAround({ x: 20, y: 20 }, 2);
  assert.ok(r2.includes(idx(22, 20)));
  assert.ok(!r2.includes(idx(22, 22)));
  assert.equal(revealAround({ x: 20, y: 20 }, 3).length, 29);
  assert.ok(revealAround({ x: 0, y: 0 }, 3).every((i) => i >= 0 && i < W * H));
});

test('ENG-3.4 a dig finds the chest within Chebyshev 1', () => {
  assert.equal(digFinds({ x: 5, y: 5 }, { x: 6, y: 6 }), true);
  assert.equal(digFinds({ x: 5, y: 5 }, { x: 7, y: 5 }), false);
  assert.equal(chebyshev({ x: 0, y: 0 }, { x: 3, y: -2 }), 3);
});
