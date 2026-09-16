import assert from 'node:assert/strict';
import { test } from 'node:test';
import { revealStaffAfterCreate } from './calendar-create-visibility.ts';

test('implicit me-only default stays implicit when booking myself', () => {
  assert.equal(revealStaffAfterCreate(null, 'acct-me', 'acct-me'), null);
});

test('implicit me-only default adds the created staff so the booking stays visible', () => {
  assert.deepEqual(revealStaffAfterCreate(null, 'acct-other', 'acct-me'), ['acct-me', 'acct-other']);
});

test('implicit default without a known me stays implicit', () => {
  assert.equal(revealStaffAfterCreate(null, 'acct-other'), null);
});

test('explicit filters still add the created staff', () => {
  assert.deepEqual(revealStaffAfterCreate([], 'acct-other', 'acct-me'), ['acct-other']);
  assert.deepEqual(revealStaffAfterCreate(['acct-me'], 'acct-other', 'acct-me'), [
    'acct-me',
    'acct-other',
  ]);
});
