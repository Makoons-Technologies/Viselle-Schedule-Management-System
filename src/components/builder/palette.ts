import type { FormioComponent } from '@/types/api';

export type PaletteGroup = 'homepage' | 'basic' | 'advanced' | 'data' | 'layout' | 'premium';

export interface PaletteItem {
  type: string;
  label: string;
  hint: string;
  group: PaletteGroup;
  make: () => FormioComponent;
}

function input(type: string, label: string, extra: Partial<FormioComponent> = {}): FormioComponent {
  return {
    type,
    key: slug(label),
    label,
    input: extra.input ?? true,
    placeholder: extra.placeholder ?? '',
    validate: extra.validate ?? { required: false },
    ...extra,
  };
}

function choices() {
  return [
    { label: 'Option 1', value: 'option_1' },
    { label: 'Option 2', value: 'option_2' },
  ];
}

export function slug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field';
}

export function uniqueKey(label: string, existing: string[]) {
  const base = slug(label);
  if (!existing.includes(base)) return base;
  let index = 2;
  while (existing.includes(`${base}_${index}`)) index += 1;
  return `${base}_${index}`;
}

export const PALETTE: PaletteItem[] = [
  { type: 'welcome', label: 'Welcome', hint: 'Greeting at the top of the dashboard', group: 'homepage', make: () => input('welcome', 'Welcome back', { input: false, content: 'Here is how the salon looks today.' }) },
  { type: 'announcement', label: 'Announcement', hint: 'Staff notice', group: 'homepage', make: () => input('announcement', 'Announcement', { input: false, content: '' }) },
  { type: 'stats', label: 'Today’s numbers', hint: 'Counts for appointments, staff, services, customers', group: 'homepage', make: () => input('stats', 'Today’s numbers', { input: false }) },
  { type: 'setup', label: 'Setup checklist', hint: 'Onboarding tasks for new salons', group: 'homepage', make: () => input('setup', 'Setup checklist', { input: false }) },
  { type: 'bookingCta', label: 'Booking link', hint: 'Shareable booking URL', group: 'homepage', make: () => input('bookingCta', 'Booking link', { input: false, content: 'Share this with clients so they can book online.' }) },
  { type: 'featuredServices', label: 'Featured services', hint: 'Services you want to highlight', group: 'homepage', make: () => input('featuredServices', 'Featured services', { input: false, serviceIds: [] }) },
  { type: 'upcoming', label: 'Upcoming visits', hint: 'Next appointments', group: 'homepage', make: () => input('upcoming', 'Coming up', { input: false }) },
  { type: 'revenue', label: 'Revenue', hint: 'Sales chart', group: 'homepage', make: () => input('revenue', 'Revenue', { input: false }) },
  { type: 'form', label: 'Embedded form', hint: 'A published form your team can fill here', group: 'homepage', make: () => input('form', 'Form', { input: false, form: '' }) },

  { type: 'textfield', label: 'Short answer', hint: 'One line of text', group: 'basic', make: () => input('textfield', 'Short answer') },
  { type: 'textarea', label: 'Long answer', hint: 'Multiple lines', group: 'basic', make: () => input('textarea', 'Long answer') },
  { type: 'number', label: 'Number', hint: 'Numeric value', group: 'basic', make: () => input('number', 'Number') },
  { type: 'password', label: 'Secret text', hint: 'Hidden text', group: 'basic', make: () => input('password', 'Secret text') },
  { type: 'checkbox', label: 'Yes / no', hint: 'Single checkbox', group: 'basic', make: () => input('checkbox', 'Yes / no') },
  { type: 'selectboxes', label: 'Check several', hint: 'Choose more than one', group: 'basic', make: () => input('selectboxes', 'Check several', { values: choices() }) },
  { type: 'select', label: 'Dropdown', hint: 'Pick from a list', group: 'basic', make: () => input('select', 'Dropdown', { values: choices() }) },
  { type: 'radio', label: 'Pick one', hint: 'Choose one option', group: 'basic', make: () => input('radio', 'Pick one', { values: choices() }) },
  { type: 'button', label: 'Action button', hint: 'Submit or reset', group: 'basic', make: () => input('button', 'Submit', { input: false, action: 'submit' }) },

  { type: 'email', label: 'Email', hint: 'Email address', group: 'advanced', make: () => input('email', 'Email') },
  { type: 'url', label: 'Website', hint: 'Website link', group: 'advanced', make: () => input('url', 'Website') },
  { type: 'phoneNumber', label: 'Phone', hint: 'Phone with keypad', group: 'advanced', make: () => input('phoneNumber', 'Phone') },
  { type: 'tags', label: 'Labels', hint: 'Add several short labels', group: 'advanced', make: () => input('tags', 'Labels') },
  { type: 'address', label: 'Address', hint: 'Street, city, state, ZIP', group: 'advanced', make: () => input('address', 'Address') },
  { type: 'datetime', label: 'Date and time', hint: 'Date and time picker', group: 'advanced', make: () => input('datetime', 'Date and time') },
  { type: 'day', label: 'Calendar date', hint: 'Month, day, and year', group: 'advanced', make: () => input('day', 'Calendar date') },
  { type: 'time', label: 'Clock time', hint: 'Time of day', group: 'advanced', make: () => input('time', 'Clock time') },
  { type: 'currency', label: 'Money', hint: 'Money amount', group: 'advanced', make: () => input('currency', 'Amount', { prefix: '$' }) },
  { type: 'survey', label: 'Rating grid', hint: 'Same answers for several questions', group: 'advanced', make: () => input('survey', 'Rating grid', { questions: [{ label: 'How was your visit?', value: 'visit' }], values: [{ label: 'Great', value: 'great' }, { label: 'Okay', value: 'okay' }, { label: 'Needs work', value: 'needs_work' }] }) },
  { type: 'signature', label: 'Sign here', hint: 'Draw a name', group: 'advanced', make: () => input('signature', 'Sign here') },

  { type: 'hidden', label: 'Hidden value', hint: 'Stored but not shown', group: 'data', make: () => input('hidden', 'Hidden value') },
  { type: 'container', label: 'Field group', hint: 'Group fields into one object', group: 'data', make: () => ({ type: 'container', key: 'group', label: 'Field group', input: false, components: [] }) },
  { type: 'datamap', label: 'Key and value', hint: 'Key / value pairs', group: 'data', make: () => input('datamap', 'Key and value') },
  { type: 'datagrid', label: 'Repeatable rows', hint: 'Repeating rows', group: 'data', make: () => input('datagrid', 'Repeatable rows', { input: false, components: [input('textfield', 'Item')] }) },
  { type: 'editgrid', label: 'Repeatable cards', hint: 'Add and edit repeating sets', group: 'data', make: () => input('editgrid', 'Repeatable cards', { input: false, components: [input('textfield', 'Item')] }) },
  { type: 'resource', label: 'Saved form', hint: 'Pick from your saved forms', group: 'data', make: () => input('resource', 'Saved form', { input: false, form: '' }) },

  { type: 'htmlelement', label: 'Heading', hint: 'Heading or static text', group: 'layout', make: () => ({ type: 'htmlelement', key: 'html', label: 'Heading', input: false, tag: 'p', content: 'Add a short note.' }) },
  { type: 'content', label: 'Note', hint: 'Static instructions', group: 'layout', make: () => ({ type: 'content', key: 'content', label: 'Note', input: false, content: 'Add instructions for the client.' }) },
  { type: 'columns', label: 'Side by side', hint: 'Side by side on desktop, stacked on phones', group: 'layout', make: () => ({ type: 'columns', key: 'columns', label: 'Side by side', input: false, columns: [{ width: 6, components: [] }, { width: 6, components: [] }] }) },
  { type: 'fieldset', label: 'Labeled group', hint: 'Group with a legend', group: 'layout', make: () => ({ type: 'fieldset', key: 'fieldset', label: 'Details', legend: 'Details', input: false, components: [] }) },
  { type: 'panel', label: 'Collapsible section', hint: 'Card that can collapse', group: 'layout', make: () => ({ type: 'panel', key: 'panel', label: 'Section', title: 'Section', collapsible: true, collapsed: false, input: false, components: [] }) },
  { type: 'table', label: 'Grid', hint: 'Grid of fields; scrolls on phones', group: 'layout', make: () => ({ type: 'table', key: 'table', label: 'Grid', input: false, rows: [[{ components: [] }, { components: [] }], [{ components: [] }, { components: [] }]] }) },
  { type: 'tabs', label: 'Tabbed section', hint: 'Tabs on desktop, accordion on phones', group: 'layout', make: () => ({ type: 'tabs', key: 'tabs', label: 'Tabbed section', input: false, components: [{ type: 'tab', key: 'tab1', label: 'Tab 1', input: false, components: [] }, { type: 'tab', key: 'tab2', label: 'Tab 2', input: false, components: [] }] }) },
  { type: 'well', label: 'Shaded box', hint: 'Shaded grouping box', group: 'layout', make: () => ({ type: 'well', key: 'well', label: 'Shaded box', input: false, components: [] }) },

  { type: 'datasource', label: 'Option source', hint: 'Static options for other fields', group: 'premium', make: () => input('datasource', 'Option source', { input: false, values: choices() }) },
  { type: 'captcha', label: 'Human check', hint: 'Simple human check (no Google key)', group: 'premium', make: () => input('captcha', 'Human check', { content: 'Type YES to confirm you are a person.' }) },
  { type: 'file', label: 'File upload', hint: 'Upload a photo or PDF', group: 'premium', make: () => input('file', 'File upload') },
  { type: 'form', label: 'Nested form', hint: 'Embed another published form', group: 'premium', make: () => input('form', 'Nested form', { input: false, form: '' }) },
  { type: 'tagpad', label: 'Photo pins', hint: 'Tap an image to drop tags', group: 'premium', make: () => input('tagpad', 'Photo pins') },
  { type: 'sketchpad', label: 'Drawing pad', hint: 'Draw on a canvas', group: 'premium', make: () => input('sketchpad', 'Drawing pad') },
  { type: 'reviewpage', label: 'Review answers', hint: 'Show answers before submit', group: 'premium', make: () => input('reviewpage', 'Review answers', { input: false }) },
  { type: 'custom', label: 'Custom block', hint: 'Note or custom JSON block', group: 'premium', make: () => ({ type: 'custom', key: 'custom', label: 'Custom block', input: false, content: '' }) },
  { type: 'datatable', label: 'Option table', hint: 'Read-only rows from options', group: 'premium', make: () => input('datatable', 'Option table', { input: false, values: choices() }) },
  { type: 'dynamicWizard', label: 'Step by step', hint: 'One repeating item at a time', group: 'premium', make: () => input('dynamicWizard', 'Step by step', { input: false, components: [input('textfield', 'Item')] }) },
];

export const GROUP_LABEL: Record<PaletteGroup, string> = {
  homepage: 'Dashboard cards',
  basic: 'Common',
  advanced: 'Extra',
  data: 'Structured',
  layout: 'Arrangement',
  premium: 'Special',
};

export function paletteFor(mode: 'form' | 'homepage') {
  if (mode === 'homepage') return PALETTE;
  return PALETTE.filter((item) => item.group !== 'homepage');
}

export function paletteLabel(type: string) {
  return PALETTE.find((item) => item.type === type)?.label ?? type;
}

export function isLayoutType(type: string) {
  return ['columns', 'fieldset', 'panel', 'table', 'tabs', 'well', 'container', 'datagrid', 'editgrid', 'dynamicWizard'].includes(type);
}

export function allKeys(components: FormioComponent[]): string[] {
  const keys: string[] = [];
  walkComponents(components, (component) => {
    if (component.key) keys.push(component.key);
  });
  return keys;
}

export function walkComponents(components: FormioComponent[], visit: (component: FormioComponent) => void) {
  for (const component of components) {
    visit(component);
    if (component.components?.length) walkComponents(component.components, visit);
    if (component.columns) {
      for (const column of component.columns) walkComponents(column.components ?? [], visit);
    }
    if (component.rows) {
      for (const row of component.rows) {
        for (const cell of row) walkComponents(cell.components ?? [], visit);
      }
    }
  }
}

export function cloneComponent(item: PaletteItem, existing: string[]): FormioComponent {
  const made = item.make();
  const key = uniqueKey(made.label || made.type, existing);
  return { ...made, key };
}
