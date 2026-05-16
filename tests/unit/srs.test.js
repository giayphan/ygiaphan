// SRS (Leitner 6-box) algorithm tests
// Run: node --test tests/unit/srs.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---- inline the logic (mirrors gas/domain/vocab/VocabController.gs) ----
const SRS_INTERVALS = [0, 1, 3, 7, 14, 30];

function nextBox(currentBox, correct) {
  if (correct) return Math.min(5, currentBox + 1);
  return 0;
}

function dueAfterMs(box) {
  return SRS_INTERVALS[box] * 24 * 60 * 60 * 1000;
}

// ---- tests ----

test('correct answer advances box by 1', () => {
  assert.equal(nextBox(0, true), 1);
  assert.equal(nextBox(2, true), 3);
  assert.equal(nextBox(4, true), 5);
});

test('wrong answer resets box to 0', () => {
  assert.equal(nextBox(3, false), 0);
  assert.equal(nextBox(5, false), 0);
  assert.equal(nextBox(1, false), 0);
});

test('box 5 is the maximum (does not exceed)', () => {
  assert.equal(nextBox(5, true), 5);
});

test('box 0 correct goes to box 1', () => {
  assert.equal(nextBox(0, true), 1);
});

test('SRS_INTERVALS has correct values for each box', () => {
  assert.equal(SRS_INTERVALS[0], 0);   // box 0 = review now
  assert.equal(SRS_INTERVALS[1], 1);   // box 1 = 1 day
  assert.equal(SRS_INTERVALS[2], 3);   // box 2 = 3 days
  assert.equal(SRS_INTERVALS[3], 7);   // box 3 = 1 week
  assert.equal(SRS_INTERVALS[4], 14);  // box 4 = 2 weeks
  assert.equal(SRS_INTERVALS[5], 30);  // box 5 = 1 month
});

test('box 5 due date is 30 days in ms', () => {
  assert.equal(dueAfterMs(5), 30 * 24 * 60 * 60 * 1000);
});

test('box 0 due date is 0ms (immediate)', () => {
  assert.equal(dueAfterMs(0), 0);
});

test('full review cycle: 5 correct answers reaches box 5', () => {
  let box = 0;
  for (let i = 0; i < 5; i++) box = nextBox(box, true);
  assert.equal(box, 5);
});

test('wrong answer mid-cycle resets to 0', () => {
  let box = nextBox(0, true); // 1
  box = nextBox(box, true);   // 2
  box = nextBox(box, false);  // 0 (wrong)
  assert.equal(box, 0);
});
