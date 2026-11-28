import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanName, pickName } from './naming.ts';

test('DAY-6.2 names are 3–24 letters and spaces, tidied and title-cased', () => {
  assert.equal(cleanName('  gull   rock '), 'Gull Rock');
  assert.equal(cleanName('MAYBE KEY'), 'Maybe Key');
  assert.equal(cleanName('ab'), null);
  assert.equal(cleanName('a'.repeat(25)), null);
  assert.equal(cleanName('Isle 2'), null);
  assert.equal(
    cleanName('Buried a deep chest on Gullrock. Can you read my map?'),
    null
  );
});

test('DAY-6.2 banned words, removed and deleted replies never win', () => {
  assert.equal(cleanName('Shit Island'), null);
  assert.equal(cleanName('Reddit Rock'), null);
  const r = pickName([
    { author: 'a', body: 'Bad Word Fuck', score: 99, removed: false },
    { author: 'b', body: 'Hidden Cove', score: 50, removed: true },
    { author: '[deleted]', body: 'Ghost Bay', score: 40, removed: false },
    { author: 'c', body: 'Salt Tooth', score: 12, removed: false },
    { author: 'd', body: 'Crab Hollow', score: 12, removed: false },
  ]);
  assert.deepEqual(r, { name: 'Salt Tooth', by: 'c' });
  assert.equal(pickName([]), null);
});
