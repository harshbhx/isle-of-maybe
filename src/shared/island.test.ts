import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Modifier } from './day.ts';
import { DEEP_MIN } from './depth.ts';
import { deepShare, generateIsland, landTarget, seedFor } from './island.ts';
import { allConnected, chebyshev, walkable } from './path.ts';
import {
  GRASS,
  H,
  LANDMARK,
  SAND,
  W,
  WATER,
  idx,
  type Island,
} from './types.ts';

const SEEDS = Array.from({ length: 200 }, (_, i) => `t${i}`);
const MODIFIERS: Modifier[] = ['clear', 'twins', 'lowtide', 'jungle', 'fog'];

const cache = new Map<string, Island>();
const island = (seed: string, m: Modifier): Island => {
  const k = `${seed}|${m}`;
  let v = cache.get(k);
  if (v === undefined) {
    v = generateIsland(seed, m);
    cache.set(k, v);
  }
  return v;
};

test('ENG-1.1 the same seed and modifier give the same island', () => {
  const a = generateIsland('maybe-2026-12-05', 'clear');
  const b = generateIsland('maybe-2026-12-05', 'clear');
  assert.deepEqual([...a.terrain], [...b.terrain]);
  assert.deepEqual(a.landmarks, b.landmarks);
  assert.equal(a.name, b.name);
});

test('ENG-2.1 land share is on target for every modifier', () => {
  for (const m of MODIFIERS) {
    for (const s of SEEDS.slice(0, 60)) {
      const isl = island(s, m);
      let land = 0;
      for (const c of isl.terrain) if (c !== WATER) land++;
      assert.ok(Math.abs(land / (W * H) - landTarget(m)) <= 0.05, `${s} ${m}`);
    }
  }
});

test('ENG-2.2 exactly one dock, on southern-coast sand with water below', () => {
  for (const s of SEEDS) {
    const isl = island(s, 'clear');
    assert.equal(isl.terrain[idx(isl.dock.x, isl.dock.y)], SAND, s);
    assert.equal(isl.terrain[idx(isl.dock.x, isl.dock.y + 1)], WATER, s);
  }
});

test('ENG-2.3 every walkable tile is reachable from the dock', () => {
  for (const m of MODIFIERS)
    for (const s of SEEDS)
      assert.ok(
        allConnected(island(s, m).terrain, island(s, m).dock),
        `${s} ${m}`
      );
});

test('ENG-2.4 landmark count, spacing, dock clearance and blocking', () => {
  for (const s of SEEDS) {
    const isl = island(s, 'clear');
    assert.ok(isl.landmarks.length >= 8 && isl.landmarks.length <= 12, s);
    for (const a of isl.landmarks) {
      assert.equal(isl.terrain[idx(a.at.x, a.at.y)], LANDMARK);
      assert.ok(!walkable(isl.terrain, a.at.x, a.at.y));
      assert.ok(chebyshev(a.at, isl.dock) >= 3, s);
      for (const b of isl.landmarks)
        if (a !== b && a.type !== b.type)
          assert.ok(chebyshev(a.at, b.at) >= 4, s);
    }
  }
});

test('ENG-2.5 Twins places two types twice, 6–10 tiles apart', () => {
  for (const s of SEEDS) {
    const isl = island(s, 'twins');
    const byType = new Map<string, number[]>();
    isl.landmarks.forEach((l, i) =>
      byType.set(l.type, [...(byType.get(l.type) ?? []), i])
    );
    const pairs = [...byType.values()].filter((v) => v.length === 2);
    assert.equal(pairs.length, 2, s);
    for (const [i, j] of pairs) {
      const a = isl.landmarks[i ?? -1];
      const b = isl.landmarks[j ?? -1];
      assert.ok(a !== undefined && b !== undefined);
      const d = chebyshev(a.at, b.at);
      assert.ok(d >= 6 && d <= 10, `${s} ${d}`);
    }
  }
});

test('ENG-2.6 at least 30% of walkable land is Deep', () => {
  for (const m of MODIFIERS)
    for (const s of SEEDS.slice(0, 60)) {
      const isl = island(s, m);
      assert.ok(
        deepShare(isl.terrain, isl.landmarks) >= 0.3,
        `${s} ${m} (DEEP_MIN ${DEEP_MIN})`
      );
    }
});

test('ENG-2.7 re-rolls are recorded in the seed and terrain codes are known', () => {
  for (const s of SEEDS) {
    const isl = island(s, 'clear');
    assert.ok(isl.seed === s || isl.seed.startsWith(`${s}#`));
    for (const c of isl.terrain)
      assert.ok([WATER, SAND, GRASS, 3, LANDMARK].includes(c));
  }
});

test('ENG-2.8 days use maybe-<day> unless overridden', () => {
  assert.equal(seedFor('2026-12-05'), 'maybe-2026-12-05');
});

test('ENG-2.10 generation is fast', () => {
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) generateIsland(`perf${i}`, 'twins');
  const per = (performance.now() - t0) / 20;
  assert.ok(per < 50, `${per.toFixed(1)} ms per island`);
});

test('ENG-2 golden: the launch-day island never changes', () => {
  const isl = generateIsland('maybe-2026-12-05', 'clear');
  const fingerprint = {
    seed: isl.seed,
    name: isl.name,
    dock: isl.dock,
    landmarks: isl.landmarks.map((l) => `${l.type}@${l.at.x},${l.at.y}`),
  };
  // If this fails, an engine change altered islands. Posted days must never change:
  // update this snapshot only through a spec change (AGENTS.md hard rule 9).
  assert.deepEqual(fingerprint, GOLDEN);
});

const GOLDEN = {
  seed: 'maybe-2026-12-05',
  name: 'Saffronrock',
  dock: { x: 18, y: 37 },
  landmarks: [
    'hut@16,25',
    'cave@17,16',
    'well@7,28',
    'boulder@3,10',
    'statue@5,14',
    'palm@13,16',
    'campfire@22,13',
    'wreck@25,8',
    'skullRock@14,5',
  ],
};

test('DAY-2.1 Lantern night only changes what you see, never the island itself', () => {
  for (const day of ['2026-12-05', '2026-12-12', '2026-12-19']) {
    const clear = generateIsland(`maybe-${day}`, 'clear');
    const lantern = generateIsland(`maybe-${day}`, 'lanterns');
    assert.deepEqual([...lantern.terrain], [...clear.terrain], day);
    assert.deepEqual(lantern.landmarks, clear.landmarks, day);
    assert.deepEqual(lantern.dock, clear.dock, day);
  }
});
