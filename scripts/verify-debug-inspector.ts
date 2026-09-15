/**
 * Gate + snapshot helper checks for the staging-only inspector.
 * Run: npx --yes tsx scripts/verify-debug-inspector.ts
 */

import assert from 'node:assert/strict';
import {
  formatElementLabel,
  isDebugInspectorEnabled,
  isDebugInspectorEnvEnabled,
  isProductionViselleHost,
  isStagingViselleHost,
  selectRelevantAttributes,
  truncateInspectorText,
} from '../src/lib/debug-inspector.ts';

function expectEnabled(hostname: string, envFlag: unknown, expected: boolean) {
  const actual = isDebugInspectorEnabled({ hostname, envFlag });
  assert.equal(actual, expected, `${hostname} env=${String(envFlag)} → ${actual}, expected ${expected}`);
}

assert.equal(isStagingViselleHost('staging.viselle.net'), true);
assert.equal(isStagingViselleHost('shop.staging.viselle.net'), true);
assert.equal(isStagingViselleHost('viselle.net'), false);
assert.equal(isStagingViselleHost('www.viselle.net'), false);

assert.equal(isProductionViselleHost('viselle.net'), true);
assert.equal(isProductionViselleHost('www.viselle.net'), true);
assert.equal(isProductionViselleHost('yourspa.viselle.net'), true);
assert.equal(isProductionViselleHost('staging.viselle.net'), false);
assert.equal(isProductionViselleHost('localhost'), false);

assert.equal(isDebugInspectorEnvEnabled('true'), true);
assert.equal(isDebugInspectorEnvEnabled('TRUE'), true);
assert.equal(isDebugInspectorEnvEnabled('false'), false);
assert.equal(isDebugInspectorEnvEnabled(undefined), false);

// Staging host always on.
expectEnabled('staging.viselle.net', undefined, true);
expectEnabled('staging.viselle.net', 'false', true);

// Production always off — even with the env flag.
expectEnabled('viselle.net', 'true', false);
expectEnabled('www.viselle.net', 'true', false);
expectEnabled('yourspa.viselle.net', 'true', false);

// Local / preview only with the explicit flag.
expectEnabled('localhost', undefined, false);
expectEnabled('localhost', 'true', true);
expectEnabled('viselle-git-staging.vercel.app', 'true', true);
expectEnabled('viselle-git-staging.vercel.app', undefined, false);

assert.equal(truncateInspectorText('  hello   world  '), 'hello world');
assert.equal(truncateInspectorText('x'.repeat(12), 10), `${'x'.repeat(9)}…`);
assert.equal(formatElementLabel('BUTTON', 'save', ['btn', 'primary']), 'button#save.btn.primary');

const attrs = selectRelevantAttributes([
  { name: 'class', value: 'hidden' },
  { name: 'role', value: 'button' },
  { name: 'aria-label', value: 'Close' },
  { name: 'data-testid', value: 'save' },
  { name: 'href', value: '/pricing' },
  { name: 'onclick', value: 'bad()' },
  { name: 'data-debug-inspector', value: 'root' },
]);
assert.deepEqual(
  attrs.map((attr) => attr.name),
  ['role', 'aria-label', 'data-testid', 'href'],
);

console.log('verify-debug-inspector: ok');
