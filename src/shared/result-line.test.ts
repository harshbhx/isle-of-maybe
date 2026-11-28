import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resultLine, type ResultWords } from './result-line.ts';

const words: ResultWords = {
  day: 'Isle of Maybe · Day {n}',
  found: 'Found a chest with {n} shovels',
  missed: 'Missed after {n} shovels',
  chest: 'Buried a {depth} chest',
  grade: 'Ink: {grade}',
  depth: { shallow: 'Shallow', buried: 'Buried', deep: 'Deep' },
  ink: { sharp: 'Sharp', steady: 'Steady', wobbly: 'Wobbly', cursed: 'Cursed' },
};

test('COM-2.6 the result line names day, shovels, outcome, depth and grade', () => {
  assert.equal(
    resultLine(
      {
        dayNumber: 12,
        hunt: { found: true, shovelsUsed: 2 },
        chest: { depth: 'deep', grade: 'steady' },
      },
      words
    ),
    'Isle of Maybe · Day 12 · Found a chest with 2 shovels · Buried a Deep chest · Ink: Steady'
  );
  assert.equal(
    resultLine(
      { dayNumber: 3, hunt: { found: false, shovelsUsed: 3 }, chest: null },
      words
    ),
    'Isle of Maybe · Day 3 · Missed after 3 shovels'
  );
});

test('COM-2.6 the result line never carries coordinates', () => {
  const line = resultLine(
    { dayNumber: 9, hunt: null, chest: { depth: 'shallow', grade: null } },
    words
  );
  assert.equal(/\d+\s*,\s*\d+/.test(line), false);
  assert.equal(line, 'Isle of Maybe · Day 9 · Buried a Shallow chest');
});
