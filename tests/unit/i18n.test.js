// i18n + pickL tests
// Run: node --test tests/unit/i18n.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---- inline pickL (mirrors assets/js/i18n.js) ----
function pickL(o, f, lang = 'vi') {
  if (!o) return '';
  if (!f) return o[lang] ?? o.vi ?? o.th ?? '';
  return o[`${f}_${lang}`] ?? o[`${f}_vi`] ?? o[f] ?? '';
}

// ---- tests ----

test('pickL returns field for active language', () => {
  const post = { title_vi: 'Chào', title_th: 'สวัสดี' };
  assert.equal(pickL(post, 'title', 'vi'), 'Chào');
  assert.equal(pickL(post, 'title', 'th'), 'สวัสดี');
});

test('pickL falls back to _vi when _th missing', () => {
  const post = { title_vi: 'Chào' };
  assert.equal(pickL(post, 'title', 'th'), 'Chào');
});

test('pickL falls back to bare field when localised missing', () => {
  const item = { label: 'Default' };
  assert.equal(pickL(item, 'label', 'vi'), 'Default');
});

test('pickL returns empty string for null/undefined object', () => {
  assert.equal(pickL(null, 'title', 'vi'), '');
  assert.equal(pickL(undefined, 'title', 'vi'), '');
});

test('pickL without field returns lang key directly', () => {
  const nav = { vi: 'Trang chủ', th: 'หน้าแรก' };
  assert.equal(pickL(nav, null, 'vi'), 'Trang chủ');
  assert.equal(pickL(nav, null, 'th'), 'หน้าแรก');
});

test('pickL without field falls back vi → th → empty', () => {
  const partial = { vi: 'hello' };
  assert.equal(pickL(partial, null, 'th'), 'hello'); // fallback to vi
});

test('pickL returns empty string when all fields missing', () => {
  const empty = {};
  assert.equal(pickL(empty, 'title', 'vi'), '');
});
