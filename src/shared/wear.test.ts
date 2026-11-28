import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeWear, encodeWear, wearLevel } from './wear.ts';

test('ADV-6.4 wear shows only from 3 hunts, in levels 1–3', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 5, 6, 14, 15, 99].map(wearLevel),
    [0, 0, 0, 1, 1, 2, 2, 3, 3]
  );
});

test('ADV-6.4 wear encodes one digit per tile and ignores bad fields', () => {
  const s = encodeWear({
    '0': '3',
    '41': '7',
    '1599': '20',
    x: '9',
    '5000': '9',
  });
  assert.equal(s.length, 1600);
  const d = decodeWear(s);
  assert.equal(d[0], 1);
  assert.equal(d[41], 2);
  assert.equal(d[1599], 3);
  assert.equal(d[1], 0);
});
