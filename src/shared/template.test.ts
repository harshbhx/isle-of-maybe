// Copy templates with counts (UI-4.2): values, and singular/plural picked by the count.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fillTemplate } from './template.ts';

test('UI-4.2 a template inserts values and leaves unknown keys alone', () => {
  assert.equal(
    fillTemplate('Day {n} · {island}', { n: 6, island: 'Mistmouth' }),
    'Day 6 · Mistmouth'
  );
  assert.equal(fillTemplate('Hi {who}', {}), 'Hi {who}');
});

test('UI-4.2 a count picks the singular for 1 and the plural otherwise', () => {
  const t = '{n} {n:shovel|shovels} left';
  assert.equal(fillTemplate(t, { n: 1 }), '1 shovel left');
  assert.equal(fillTemplate(t, { n: 0 }), '0 shovels left');
  assert.equal(fillTemplate(t, { n: 2 }), '2 shovels left');
  // Formatted numbers still count by value.
  assert.equal(fillTemplate('{n} {n:sailor|sailors}', { n: '1' }), '1 sailor');
});

test('UI-4.2 a word choice can depend on a different key than the one it sits next to', () => {
  assert.equal(
    fillTemplate('{buried} {buried:chest|chests} buried · {found} found', {
      buried: 1,
      found: 3,
    }),
    '1 chest buried · 3 found'
  );
});
