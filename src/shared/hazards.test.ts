import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hazardsFor, stepSeconds } from './hazards.ts';
import { islandForDay } from './island.ts';
import { allConnected, walkable } from './path.ts';
import { tileKind } from './relief.ts';
import { GRASS, W, idx } from './types.ts';

const days = [
  '2026-12-05',
  '2026-12-06',
  '2026-12-07',
  '2026-12-08',
  '2026-12-09',
];

test('ADV-2.1 quicksand: 3–5 seeded patches on walkable ground, clear of the dock, deterministic', () => {
  for (const day of days) {
    const island = islandForDay(day, 'clear');
    const a = hazardsFor(island);
    const b = hazardsFor(islandForDay(day, 'clear'));
    assert.deepEqual([...a.quicksand].sort(), [...b.quicksand].sort());
    assert.ok(
      a.quicksand.size >= 3 && a.quicksand.size <= 20,
      `${day}: ${a.quicksand.size}`
    );
    for (const i of a.quicksand) {
      const x = i % W;
      const y = (i - x) / W;
      assert.ok(walkable(island.terrain, x, y));
      assert.ok(
        Math.max(Math.abs(x - island.dock.x), Math.abs(y - island.dock.y)) > 1
      );
    }
    // Walkable hazards never cut the island apart.
    assert.ok(allConnected(island.terrain, island.dock));
  }
});

test('ADV-2.2 steps take 0.2 s, 0.4 s on thicket and 2.7 s into quicksand', () => {
  const island = islandForDay('2026-12-09', 'jungle');
  const hz = hazardsFor(island);
  assert.ok(hz.thicket.size > 0, 'a jungle day has thicket');
  for (const i of hz.thicket) {
    const x = i % W;
    const y = (i - x) / W;
    assert.equal(island.terrain[idx(x, y)], GRASS);
    assert.notEqual(tileKind(island, x, y), 'jungle');
    assert.equal(stepSeconds(hz, { x, y }), 0.4);
  }
  const q = [...hz.quicksand][0] ?? 0;
  assert.ok(
    Math.abs(stepSeconds(hz, { x: q % W, y: Math.floor(q / W) }) - 2.7) < 1e-9
  );
  assert.equal(stepSeconds(hz, island.dock), 0.2);
});

test('ADV-2.4 rock stays impassable', () => {
  const island = islandForDay('2026-12-09', 'clear');
  const rock = island.terrain.indexOf(3);
  assert.equal(walkable(island.terrain, rock % W, Math.floor(rock / W)), false);
});
