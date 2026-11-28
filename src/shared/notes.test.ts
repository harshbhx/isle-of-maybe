import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTES, NOTE_IDS, asNoteId } from './notes.ts';

test('CHART-2.7 every note id has a phrase and only listed ids are accepted', () => {
  assert.deepEqual([...NOTE_IDS].sort(), Object.keys(NOTES).sort());
  assert.equal(asNoteId('steps'), 'steps');
  assert.equal(asNoteId('hello sailor'), null);
  assert.equal(asNoteId(3), null);
  for (const t of Object.values(NOTES)) assert.ok(t.length <= 32);
});
