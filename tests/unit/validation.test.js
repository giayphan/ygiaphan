// Input validation tests (mirrors gas/Code.gs validation logic)
// Run: node --test tests/unit/validation.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---- inline validators ----
const isValidEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s || '').trim());
const isValidSlug  = (s) => /^[a-z0-9-]+$/i.test(String(s || ''));
const isValidOtp   = (s) => /^\d{6}$/.test(String(s || ''));
const maskEmails   = (s) => String(s || '').replace(/([\w.+-]{1,3})[\w.+-]*@([\w-]+\.[\w.-]+)/g, '$1***@***');
const hasXss       = (s) => /<script|<iframe|javascript:/i.test(s);

const isValidDonationAmount = (n) => {
  const v = Number(n);
  return !isNaN(v) && v >= 1 && v <= 1000000;
};

const ALLOWED_CHANNELS = ['promptpay', 'paypal', 'bank'];
const isValidChannel = (c) => ALLOWED_CHANNELS.includes(String(c));

// ---- email ----
test('valid emails pass', () => {
  assert.ok(isValidEmail('user@example.com'));
  assert.ok(isValidEmail('a+b@sub.domain.org'));
  assert.ok(isValidEmail('test123@mail.co.th'));
});

test('invalid emails fail', () => {
  assert.ok(!isValidEmail(''));
  assert.ok(!isValidEmail('notanemail'));
  assert.ok(!isValidEmail('@nodomain.com'));
  assert.ok(!isValidEmail('no spaces @x.com'));
});

// ---- slug ----
test('valid slugs pass', () => {
  assert.ok(isValidSlug('greetings'));
  assert.ok(isValidSlug('six-tones'));
  assert.ok(isValidSlug('ordering-food-123'));
});

test('invalid slugs fail', () => {
  assert.ok(!isValidSlug(''));
  assert.ok(!isValidSlug('has space'));
  assert.ok(!isValidSlug('has/slash'));
  assert.ok(!isValidSlug('../path-traversal'));
});

// ---- OTP ----
test('valid 6-digit OTP passes', () => {
  assert.ok(isValidOtp('123456'));
  assert.ok(isValidOtp('000000'));
  assert.ok(isValidOtp('999999'));
});

test('invalid OTP fails', () => {
  assert.ok(!isValidOtp('12345'));   // too short
  assert.ok(!isValidOtp('1234567')); // too long
  assert.ok(!isValidOtp('abcdef'));  // letters
  assert.ok(!isValidOtp(''));
});

// ---- email masking ----
test('maskEmails hides email in text', () => {
  const result = maskEmails('Contact me at user@example.com please');
  assert.ok(!result.includes('user@example.com'));
  assert.ok(result.includes('***@***'));
});

test('maskEmails keeps non-email text intact', () => {
  const text = 'Hello world, no emails here';
  assert.equal(maskEmails(text), text);
});

// ---- XSS detection ----
test('XSS patterns are detected', () => {
  assert.ok(hasXss('<script>alert(1)</script>'));
  assert.ok(hasXss('<iframe src="x">'));
  assert.ok(hasXss('javascript:void(0)'));
});

test('safe text is not flagged', () => {
  assert.ok(!hasXss('Hello, how are you?'));
  assert.ok(!hasXss('Price: 100 baht'));
});

// ---- donation amount ----
test('valid donation amounts pass', () => {
  assert.ok(isValidDonationAmount(1));
  assert.ok(isValidDonationAmount(100));
  assert.ok(isValidDonationAmount(1000000));
});

test('invalid donation amounts fail', () => {
  assert.ok(!isValidDonationAmount(0));
  assert.ok(!isValidDonationAmount(-1));
  assert.ok(!isValidDonationAmount(1000001));
  assert.ok(!isValidDonationAmount('abc'));
});

// ---- donation channel ----
test('valid channels pass', () => {
  assert.ok(isValidChannel('promptpay'));
  assert.ok(isValidChannel('paypal'));
  assert.ok(isValidChannel('bank'));
});

test('invalid channels fail', () => {
  assert.ok(!isValidChannel('crypto'));
  assert.ok(!isValidChannel(''));
  assert.ok(!isValidChannel('PROMPTPAY')); // case-sensitive
});
