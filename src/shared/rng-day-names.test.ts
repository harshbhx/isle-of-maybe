import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LAUNCH_DAY,
  addDays,
  dayNumber,
  modifierFor,
  msUntilNextDay,
  revealRadius,
  scheduledModifier,
  utcDay,
} from './day.ts';
import { islandName } from './names.ts';
import { hash32, int, rngFor, shuffle } from './rng.ts';

test('ENG-1.2 same seed gives the same sequence', () => {
  const a = rngFor('maybe-2026-12-05');
  const b = rngFor('maybe-2026-12-05');
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test('ENG-1.2 different seeds diverge and values stay in [0, 1)', () => {
  const a = rngFor('a');
  const b = rngFor('b');
  let same = 0;
  for (let i = 0; i < 100; i++) {
    const x = a();
    const y = b();
    assert.ok(x >= 0 && x < 1);
    if (x === y) same++;
  }
  assert.ok(same < 3);
  assert.notEqual(hash32('a'), hash32('b'));
});

test('ENG-1.2 int is inclusive and shuffle keeps every element', () => {
  const r = rngFor('int');
  const seen = new Set<number>();
  for (let i = 0; i < 500; i++) seen.add(int(r, 2, 4));
  assert.deepEqual([...seen].sort(), [2, 3, 4]);
  assert.deepEqual(
    shuffle(rngFor('s'), [1, 2, 3, 4, 5]).sort(),
    [1, 2, 3, 4, 5]
  );
});

test('ENG-1.3 UTC day boundaries', () => {
  assert.equal(utcDay(Date.parse('2026-12-05T23:59:59.999Z')), '2026-12-05');
  assert.equal(utcDay(Date.parse('2026-12-06T00:00:00.000Z')), '2026-12-06');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(msUntilNextDay(Date.parse('2026-12-05T23:00:00Z')), 3_600_000);
});

test('ENG-1.3 day numbers start at 1 on launch day', () => {
  assert.equal(dayNumber(LAUNCH_DAY), 1);
  assert.equal(dayNumber(addDays(LAUNCH_DAY, 12)), 13);
  assert.throws(() => dayNumber('5 Dec'));
});

test('DAY-2.1 weekday modifier cycle', () => {
  // 2026-12-07 is a Monday.
  assert.equal(scheduledModifier('2026-12-07'), 'clear');
  assert.equal(scheduledModifier('2026-12-08'), 'twins');
  assert.equal(scheduledModifier('2026-12-09'), 'lowtide');
  assert.equal(scheduledModifier('2026-12-10'), 'jungle');
  assert.equal(scheduledModifier('2026-12-11'), 'fog');
  assert.equal(scheduledModifier('2026-12-12'), 'lanterns');
  assert.equal(scheduledModifier('2026-12-13'), 'storm');
});

test('DAY-2.2 unimplemented modifiers fall back to clear skies', () => {
  assert.equal(modifierFor('2026-12-12'), 'clear');
  assert.equal(modifierFor('2026-12-13'), 'clear');
  assert.equal(modifierFor('2026-12-11'), 'fog');
});

test('ENG-3.3 reveal radius by modifier', () => {
  assert.equal(revealRadius('clear'), 4);
  assert.equal(revealRadius('fog'), 2);
  assert.equal(revealRadius('twins'), 3);
});

test('ENG-2.9 island names are deterministic and never "Isle of"', () => {
  assert.equal(islandName(rngFor('n')), islandName(rngFor('n')));
  const r = rngFor('names');
  for (let i = 0; i < 300; i++) {
    const n = islandName(r);
    assert.ok(n.length >= 4 && n.length <= 24, n);
    assert.ok(!/^isle of/i.test(n), n);
  }
});
