import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chartX, inkCheck, validateChart } from './chart.ts';
import { generateIsland } from './island.ts';
import type { ChartPiece } from './types.ts';

const X: ChartPiece = { k: 'x', x: 10, y: 10 };
const stamp = (x: number): ChartPiece => ({ k: 'stamp', t: 'palm', x, y: 5 });

test('ENG-5.1 accepts up to 6 stamps, one path of ≤ 8 segments and exactly one X', () => {
  const path: ChartPiece = {
    k: 'path',
    pts: Array.from({ length: 9 }, (_, i) => ({ x: i, y: i % 2 })),
  };
  assert.deepEqual(validateChart([...[1, 2, 3, 4, 5, 6].map(stamp), path, X]), {
    ok: true,
  });
});

test('ENG-5.1 rejects too many stamps, long paths, missing or double X', () => {
  assert.equal(
    validateChart([...[1, 2, 3, 4, 5, 6, 7].map(stamp), X]).ok,
    false
  );
  const long: ChartPiece = {
    k: 'path',
    pts: Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 })),
  };
  assert.equal(validateChart([long, X]).ok, false);
  assert.equal(validateChart([stamp(1)]).ok, false);
  assert.equal(validateChart([X, X]).ok, false);
});

test('ENG-5.1 rejects out-of-bounds, non-integers, unknown stamps, zero-length segments and two paths', () => {
  assert.equal(validateChart([{ k: 'x', x: 40, y: 0 }]).ok, false);
  assert.equal(validateChart([{ k: 'x', x: 1.5, y: 0 }]).ok, false);
  const bad = JSON.parse(
    '[{"k":"stamp","t":"castle","x":1,"y":1},{"k":"x","x":1,"y":1}]'
  ) as ChartPiece[];
  assert.equal(validateChart(bad).ok, false);
  assert.equal(
    validateChart([
      {
        k: 'path',
        pts: [
          { x: 1, y: 1 },
          { x: 1, y: 1 },
        ],
      },
      X,
    ]).ok,
    false
  );
  const p: ChartPiece = {
    k: 'path',
    pts: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  };
  assert.equal(validateChart([p, p, X]).ok, false);
});

test('ENG-5.2 ink check grades by X error and stamp error', () => {
  const isl = generateIsland('ink', 'clear');
  const chest = { x: 20, y: 20 };
  const first = isl.landmarks[0];
  assert.ok(first !== undefined);
  const exactStamp: ChartPiece = {
    k: 'stamp',
    t: first.type,
    x: first.at.x,
    y: first.at.y,
  };
  assert.equal(
    inkCheck(isl, chest, [exactStamp, { k: 'x', x: 20, y: 21 }]).grade,
    'sharp'
  );
  assert.equal(
    inkCheck(isl, chest, [{ k: 'x', x: 22, y: 22 }]).grade,
    'steady'
  );
  assert.equal(
    inkCheck(isl, chest, [{ k: 'x', x: 25, y: 20 }]).grade,
    'wobbly'
  );
  assert.equal(
    inkCheck(isl, chest, [{ k: 'x', x: 30, y: 20 }]).grade,
    'cursed'
  );
  const far: ChartPiece = {
    k: 'stamp',
    t: first.type,
    x: (first.at.x + 8) % 40,
    y: first.at.y,
  };
  assert.equal(
    inkCheck(isl, chest, [far, { k: 'x', x: 20, y: 21 }]).grade,
    'steady'
  );
  assert.deepEqual(chartX([stamp(1), X]), { x: 10, y: 10 });
});
