import type { FormioComponent, FormioSchema, OrgForm, OrgFormSubmission } from '@/types/api';

export function liveFormSchema(form: Pick<OrgForm, 'status' | 'schema' | 'publishedSchema'>): FormioSchema {
  if (form.status === 'published') {
    return form.publishedSchema ?? form.schema ?? { display: 'form', components: [] };
  }
  return form.schema ?? { display: 'form', components: [] };
}

export function formIsPublic(form: Pick<OrgForm, 'visibility'>) {
  return form.visibility !== 'private';
}

export function formPublicUrl(shareToken?: string | null) {
  if (!shareToken) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/f/${shareToken}`;
}

export function formPrivateUrl(orgId: string, formId: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/orgs/${orgId}/forms/${formId}/fill`;
}

export function formVersionLabel(form: Pick<OrgForm, 'currentVersion' | 'status'>) {
  const version = form.currentVersion ?? 0;
  if (!version) return null;
  return `v${version}`;
}

export function walkFormComponents(components: FormioComponent[], visit: (component: FormioComponent) => void) {
  for (const component of components) {
    visit(component);
    if (component.components?.length) walkFormComponents(component.components, visit);
    if (component.columns) {
      for (const column of component.columns) walkFormComponents(column.components ?? [], visit);
    }
    if (component.rows) {
      for (const row of component.rows) {
        for (const cell of row) walkFormComponents(cell.components ?? [], visit);
      }
    }
  }
}

export function labelForField(schema: FormioSchema, key: string): string {
  let found = key;
  walkFormComponents(schema.components ?? [], (component) => {
    if (component.key === key && component.label) found = component.label;
  });
  return found;
}

export function formatFormAnswer(answer: unknown): string {
  if (typeof answer === 'boolean') return answer ? 'Yes' : 'No';
  if (Array.isArray(answer)) return answer.map((item) => formatFormAnswer(item)).join(', ');
  if (answer && typeof answer === 'object') {
    return Object.values(answer)
      .map((item) => formatFormAnswer(item))
      .filter((item) => item && item !== '—')
      .join(', ');
  }
  if (answer == null || answer === '') return '—';
  return String(answer);
}

export function submissionEntries(submission: OrgFormSubmission, schema: FormioSchema) {
  return Object.entries(submission.data ?? {}).map(([key, answer]) => ({
    key,
    label: labelForField(schema, key),
    value: formatFormAnswer(answer),
  }));
}
