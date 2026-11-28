// Daily biome tests (ADV-10.1).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BIOMES, biomeFor } from './biome.ts';
import { addDays, LAUNCH_DAY } from './day.ts';
import { generateIsland, seedFor } from './island.ts';

const days = Array.from({ length: 14 }, (_, i) => addDays(LAUNCH_DAY, i));

test('ADV-10.1 the biome is a pure function of the seed', () => {
  for (const d of days)
    assert.equal(biomeFor(seedFor(d)), biomeFor(seedFor(d)));
});

test('ADV-10.1 launch day is Tropical and the launch fortnight shows every biome', () => {
  const seen = days.map((d) => biomeFor(seedFor(d)));
  assert.equal(seen[0], 'tropical');
  assert.deepEqual(new Set(seen), new Set(BIOMES));
});

test('ADV-10.1 two days in a row never share a biome during the launch fortnight', () => {
  for (let i = 1; i < days.length; i++)
    assert.notEqual(
      biomeFor(seedFor(days[i] ?? '')),
      biomeFor(seedFor(days[i - 1] ?? ''))
    );
});

test('ADV-10.1 the biome leaves the island itself unchanged', () => {
  const seed = seedFor(LAUNCH_DAY);
  const a = generateIsland(seed, 'clear');
  biomeFor(seed);
  assert.deepEqual(generateIsland(seed, 'clear'), a);
});
