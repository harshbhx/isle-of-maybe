// The splash's calendar label for a UTC game day (DAY-3.4).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayLabel } from './day.ts';

test('DAY-3.4 the splash date reads as a short English UTC day', () => {
  assert.equal(dayLabel('2026-12-09'), 'Wed 9 Dec');
  assert.equal(dayLabel('2026-11-28'), 'Sat 28 Nov');
  // The UTC day, never the viewer's local day.
  assert.equal(dayLabel('2027-01-01'), 'Fri 1 Jan');
});

test('DAY-3.4 a malformed day gives no date instead of "Invalid Date"', () => {
  assert.equal(dayLabel(''), '');
  assert.equal(dayLabel('2026-13-40'), '');
  assert.equal(dayLabel('tomorrow'), '');
});
