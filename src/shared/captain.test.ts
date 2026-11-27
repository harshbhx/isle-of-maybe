import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captainChart, captainChests } from './captain.ts';
import { chartX, validateChart } from './chart.ts';
import { generateIsland } from './island.ts';
import { chebyshev, walkable } from './path.ts';
import { rngFor } from './rng.ts';

test('ENG-6.2 three captain chests on walkable tiles, one per depth where possible', () => {
  for (let i = 0; i < 50; i++) {
    const isl = generateIsland(`cap${i}`, 'clear');
    const chests = captainChests(isl, rngFor(`cap${i}`));
    assert.equal(chests.length, 3);
    for (const c of chests) assert.ok(walkable(isl.terrain, c.at.x, c.at.y));
    assert.deepEqual(
      chests.map((c) => c.depth),
      ['shallow', 'buried', 'deep']
    );
  }
});

test('ENG-6.1 captain charts are valid, 3–5 stamps, X within 1–2 tiles, deterministic', () => {
  for (let i = 0; i < 100; i++) {
    const isl = generateIsland(`cc${i}`, i % 2 === 0 ? 'clear' : 'twins');
    for (const c of captainChests(isl, rngFor(`cc${i}`))) {
      const pieces = captainChart(isl, c.at, rngFor(`chart${i}`));
      assert.deepEqual(validateChart(pieces), { ok: true });
      const stamps = pieces.filter((p) => p.k === 'stamp').length;
      assert.ok(stamps >= 3 && stamps <= 5);
      const x = chartX(pieces);
      assert.ok(x !== null);
      const d = chebyshev(x, c.at);
      assert.ok(d >= 1 && d <= 2, `X ${d} tiles off`);
      assert.deepEqual(pieces, captainChart(isl, c.at, rngFor(`chart${i}`)));
    }
  }
});

test('ENG-6.3 captain paths end at the X and never touch the chest', () => {
  for (let i = 0; i < 100; i++) {
    const isl = generateIsland(`path${i}`, i % 2 === 0 ? 'clear' : 'fog');
    for (const c of captainChests(isl, rngFor(`path${i}`))) {
      const pieces = captainChart(isl, c.at, rngFor(`p${i}`));
      const x = chartX(pieces);
      const path = pieces.find((p) => p.k === 'path');
      assert.ok(x !== null);
      if (path === undefined || path.k !== 'path') continue;
      const last = path.pts[path.pts.length - 1];
      assert.deepEqual(last, x);
      assert.ok(
        path.pts.every((p) => p.x !== c.at.x || p.y !== c.at.y),
        `path${i} touches the chest`
      );
    }
  }
});
