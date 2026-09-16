import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formEditorIsDirty, formEditorLoadState, formSchemasMatch } from './forms.ts';

test('form editor load state distinguishes loading, error, missing, and ready', () => {
  assert.equal(formEditorLoadState({ isPending: true, isError: false }), 'loading');
  assert.equal(formEditorLoadState({ isPending: false, isError: true }), 'error');
  assert.equal(formEditorLoadState({ isPending: false, isError: false }), 'not_found');
  assert.equal(formEditorLoadState({ isPending: false, isError: false, form: { id: '1' } }), 'ready');
});

test('form editor dirty check treats empty schemas as equal and names as trimmed', () => {
  const empty = { display: 'form', components: [] };
  assert.equal(formSchemasMatch(undefined, empty), true);
  assert.equal(formEditorIsDirty('Consult', empty, { name: 'Consult', schema: empty }), false);
  assert.equal(formEditorIsDirty(' Consult ', empty, { name: 'Consult', schema: empty }), false);
  assert.equal(formEditorIsDirty('Intake', empty, { name: 'Consult', schema: empty }), true);
  assert.equal(
    formEditorIsDirty('Consult', { display: 'form', components: [{ type: 'textfield', key: 'name' }] }, {
      name: 'Consult',
      schema: empty,
    }),
    true,
  );
});
