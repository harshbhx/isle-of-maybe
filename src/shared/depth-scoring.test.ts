import assert from 'node:assert/strict';
import { test } from 'node:test';
import { depthClass, depthMult } from './depth.ts';
import { finderGold, salvage, tierFor, trustScore } from './scoring.ts';
import type { Landmark } from './types.ts';

const lm = (x: number, y: number): Landmark => ({
  id: 0,
  type: 'palm',
  at: { x, y },
});

test('ENG-4.1 depth boundaries: ≤2 shallow, 3–4 buried, ≥5 deep', () => {
  const marks = [lm(10, 10)];
  assert.equal(depthClass({ x: 12, y: 10 }, marks), 'shallow');
  assert.equal(depthClass({ x: 13, y: 10 }, marks), 'buried');
  assert.equal(depthClass({ x: 14, y: 12 }, marks), 'buried');
  assert.equal(depthClass({ x: 15, y: 10 }, marks), 'deep');
  assert.deepEqual(
    [depthMult('shallow'), depthMult('buried'), depthMult('deep')],
    [1, 2, 3]
  );
});

test('ENG-4.2 finder gold', () => {
  assert.equal(finderGold('shallow', 2, 30, 10), 80);
  assert.equal(finderGold('deep', 2, 15, 10), 3 * 80 + 20);
  assert.equal(finderGold('buried', 0, 16, 10), 2 * 40);
  assert.equal(finderGold('buried', 1, 15, 10), 2 * 60 + 20);
});

test('ENG-4.3 salvage per find', () => {
  assert.deepEqual(
    [salvage('shallow'), salvage('buried'), salvage('deep')],
    [10, 20, 30]
  );
});

test('ENG-4.4 trust score: Bayesian prior and votes', () => {
  assert.equal(
    trustScore({ attempts: 0, finds: 0, trueVotes: 0, cursedVotes: 0 }),
    0.5
  );
  assert.ok(
    trustScore({ attempts: 1, finds: 1, trueVotes: 0, cursedVotes: 0 }) <
      trustScore({ attempts: 10, finds: 9, trueVotes: 0, cursedVotes: 0 })
  );
  const voted = trustScore({
    attempts: 10,
    finds: 5,
    trueVotes: 4,
    cursedVotes: 0,
  });
  assert.ok(Math.abs(voted - (6 / 12 + 0.05)) < 1e-9);
});

test('ENG-4.5 tiers at 0/5/25/75/200', () => {
  assert.deepEqual([0, 4, 5, 24, 25, 74, 75, 199, 200].map(tierFor), [
    'deckhand',
    'deckhand',
    'mapmaker',
    'mapmaker',
    'navigator',
    'navigator',
    'cartographer',
    'cartographer',
    'legend',
  ]);
});
