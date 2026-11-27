import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bitsFromHex, bitsToHex, getBit, setBit } from './bits.ts';
import { addDays } from './day.ts';
import { STREAK_BYTES, dayOfYear, streakLength } from './streak.ts';

const setOf = (days: string[]) => (d: string) => days.includes(d);

test('DAY-4.1 day-of-year bits fit a leap year and survive a hex round trip', () => {
  assert.equal(dayOfYear('2026-01-01'), 0);
  assert.equal(dayOfYear('2028-12-31'), 365);
  const bits = new Uint8Array(STREAK_BYTES);
  setBit(bits, 0);
  setBit(bits, 365);
  const back = bitsFromHex(bitsToHex(bits), STREAK_BYTES);
  assert.ok(getBit(back, 0) && getBit(back, 365) && !getBit(back, 1));
  assert.equal(
    bitsFromHex('zz', STREAK_BYTES).every((b) => b === 0),
    true
  );
});

test('DAY-4.2 the streak ends today, or yesterday if today has no hunt yet', () => {
  const today = '2026-12-10';
  const days = [0, 1, 2, 4].map((i) => addDays(today, -i));
  assert.equal(streakLength(setOf(days), today), 3);
  assert.equal(streakLength(setOf(days.slice(1)), today), 2);
  assert.equal(streakLength(setOf([addDays(today, -2)]), today), 0);
  assert.equal(streakLength(setOf([]), today), 0);
});

test('DAY-4.2 the streak carries across 1 January', () => {
  const days = ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'];
  assert.equal(streakLength(setOf(days), '2027-01-02'), 4);
});
