import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  accountDisplayName,
  defaultSelectedStaffIds,
  resolveMyAccountId,
  staffAccountsForFilter,
  staffScheduleLabel,
  staffScheduleTriggerLabel,
} from './staff-schedule-filter.ts';

const jordan = {
  id: 'acct-jordan',
  firstName: 'Jordan',
  lastName: 'Lee',
  email: 'jordan@example.com',
  role: 'staff',
};
const owner = {
  id: 'acct-owner',
  firstName: 'Avery',
  lastName: 'Chen',
  email: 'avery@example.com',
  role: 'org_owner',
};
const riley = {
  id: 'acct-riley',
  firstName: 'Riley',
  lastName: 'Patel',
  email: 'riley@example.com',
  role: 'staff',
};

test('first-load default is the current staff member only', () => {
  assert.deepEqual(defaultSelectedStaffIds('acct-jordan'), ['acct-jordan']);
  assert.deepEqual(defaultSelectedStaffIds(null), []);
  assert.deepEqual(defaultSelectedStaffIds(undefined), []);
});

test('resolveMyAccountId prefers the session account over membership and owner', () => {
  assert.equal(
    resolveMyAccountId({
      userAccountId: 'acct-jordan',
      memberships: [{ organizationId: 'org-1', accountId: 'acct-other' }],
      orgId: 'org-1',
      accounts: [owner, jordan],
    }),
    'acct-jordan',
  );
});

test('resolveMyAccountId uses membership when the session has no accountId', () => {
  assert.equal(
    resolveMyAccountId({
      memberships: [{ organizationId: 'org-1', accountId: 'acct-jordan' }],
      orgId: 'org-1',
      accounts: [owner],
    }),
    'acct-jordan',
  );
});

test('preview / impersonation treats the org owner as me', () => {
  assert.equal(
    resolveMyAccountId({
      orgId: 'org-1',
      accounts: [jordan, owner],
    }),
    'acct-owner',
  );
});

test('staffScheduleLabel appends (me) only for the current account', () => {
  assert.equal(staffScheduleLabel(jordan, 'acct-jordan'), 'Jordan Lee (me)');
  assert.equal(staffScheduleLabel(jordan, 'acct-owner'), 'Jordan Lee');
  assert.equal(accountDisplayName({ ...jordan, firstName: '', lastName: '' }), 'jordan@example.com');
});

test('trigger label shows (me) when only the current user is selected', () => {
  assert.equal(
    staffScheduleTriggerLabel({
      accounts: [jordan, riley],
      selectedIds: ['acct-jordan'],
      meAccountId: 'acct-jordan',
    }),
    'Jordan Lee (me)',
  );
  assert.equal(
    staffScheduleTriggerLabel({
      accounts: [jordan, riley],
      selectedIds: ['acct-jordan', 'acct-riley'],
      meAccountId: 'acct-jordan',
    }),
    'All schedules',
  );
  assert.equal(
    staffScheduleTriggerLabel({
      accounts: [jordan, riley],
      selectedIds: ['acct-riley'],
      meAccountId: 'acct-jordan',
    }),
    'Riley Patel',
  );
});

test('filter list includes a non-bookable me so preview-as-owner still works', () => {
  const accounts = [
    { ...owner, status: 'active', isBookable: false },
    { ...jordan, status: 'active', isBookable: true },
    { ...riley, status: 'inactive', isBookable: true },
  ];
  const listed = staffAccountsForFilter(accounts, owner.id);
  assert.equal(listed.some((account) => account.id === owner.id), true);
  assert.equal(listed.some((account) => account.id === jordan.id), true);
  assert.equal(listed.some((account) => account.id === riley.id), false);
});
