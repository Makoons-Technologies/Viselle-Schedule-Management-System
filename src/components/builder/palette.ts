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

  { type: 'textfield', label: 'Text Field', hint: 'One line of text', group: 'basic', make: () => input('textfield', 'Text Field') },
  { type: 'textarea', label: 'Text Area', hint: 'Multiple lines', group: 'basic', make: () => input('textarea', 'Text Area') },
  { type: 'number', label: 'Number', hint: 'Numeric value', group: 'basic', make: () => input('number', 'Number') },
  { type: 'password', label: 'Password', hint: 'Hidden text', group: 'basic', make: () => input('password', 'Password') },
  { type: 'checkbox', label: 'Checkbox', hint: 'Yes / no', group: 'basic', make: () => input('checkbox', 'Checkbox') },
  { type: 'selectboxes', label: 'Select Boxes', hint: 'Choose more than one', group: 'basic', make: () => input('selectboxes', 'Select Boxes', { values: choices() }) },
  { type: 'select', label: 'Select', hint: 'Dropdown list', group: 'basic', make: () => input('select', 'Select', { values: choices() }) },
  { type: 'radio', label: 'Radio', hint: 'Choose one option', group: 'basic', make: () => input('radio', 'Radio', { values: choices() }) },
  { type: 'button', label: 'Button', hint: 'Submit or reset', group: 'basic', make: () => input('button', 'Submit', { input: false, action: 'submit' }) },

  { type: 'email', label: 'Email', hint: 'Email address', group: 'advanced', make: () => input('email', 'Email') },
  { type: 'url', label: 'URL', hint: 'Website link', group: 'advanced', make: () => input('url', 'Website') },
  { type: 'phoneNumber', label: 'Phone Number', hint: 'Phone with keypad', group: 'advanced', make: () => input('phoneNumber', 'Phone') },
  { type: 'tags', label: 'Tags', hint: 'Add several short labels', group: 'advanced', make: () => input('tags', 'Tags') },
  { type: 'address', label: 'Address', hint: 'Street, city, state, ZIP', group: 'advanced', make: () => input('address', 'Address') },
  { type: 'datetime', label: 'Date / Time', hint: 'Date and time picker', group: 'advanced', make: () => input('datetime', 'Date / Time') },
  { type: 'day', label: 'Day', hint: 'Month, day, and year', group: 'advanced', make: () => input('day', 'Day') },
  { type: 'time', label: 'Time', hint: 'Time of day', group: 'advanced', make: () => input('time', 'Time') },
  { type: 'currency', label: 'Currency', hint: 'Money amount', group: 'advanced', make: () => input('currency', 'Amount', { prefix: '$' }) },
  { type: 'survey', label: 'Survey', hint: 'Same answers for several questions', group: 'advanced', make: () => input('survey', 'Survey', { questions: [{ label: 'How was your visit?', value: 'visit' }], values: [{ label: 'Great', value: 'great' }, { label: 'Okay', value: 'okay' }, { label: 'Needs work', value: 'needs_work' }] }) },
  { type: 'signature', label: 'Signature', hint: 'Draw a name', group: 'advanced', make: () => input('signature', 'Signature') },

  { type: 'hidden', label: 'Hidden', hint: 'Stored but not shown', group: 'data', make: () => input('hidden', 'Hidden') },
  { type: 'container', label: 'Container', hint: 'Group fields into one object', group: 'data', make: () => ({ type: 'container', key: 'group', label: 'Group', input: false, components: [] }) },
  { type: 'datamap', label: 'Data Map', hint: 'Key / value pairs', group: 'data', make: () => input('datamap', 'Data Map') },
  { type: 'datagrid', label: 'Data Grid', hint: 'Repeating rows', group: 'data', make: () => input('datagrid', 'Data Grid', { input: false, components: [input('textfield', 'Item')] }) },
  { type: 'editgrid', label: 'Edit Grid', hint: 'Add and edit repeating sets', group: 'data', make: () => input('editgrid', 'Edit Grid', { input: false, components: [input('textfield', 'Item')] }) },
  { type: 'resource', label: 'Resource', hint: 'Pick from your saved forms', group: 'data', make: () => input('resource', 'Resource', { input: false, form: '' }) },

  { type: 'htmlelement', label: 'HTML Element', hint: 'Heading or static text', group: 'layout', make: () => ({ type: 'htmlelement', key: 'html', label: 'Heading', input: false, tag: 'p', content: 'Add a short note.' }) },
  { type: 'content', label: 'Content', hint: 'Rich/static note', group: 'layout', make: () => ({ type: 'content', key: 'content', label: 'Note', input: false, content: 'Add instructions for the client.' }) },
  { type: 'columns', label: 'Columns', hint: 'Side by side on desktop, stacked on phones', group: 'layout', make: () => ({ type: 'columns', key: 'columns', label: 'Columns', input: false, columns: [{ width: 6, components: [] }, { width: 6, components: [] }] }) },
  { type: 'fieldset', label: 'Field Set', hint: 'Group with a legend', group: 'layout', make: () => ({ type: 'fieldset', key: 'fieldset', label: 'Details', legend: 'Details', input: false, components: [] }) },
  { type: 'panel', label: 'Panel', hint: 'Card that can collapse', group: 'layout', make: () => ({ type: 'panel', key: 'panel', label: 'Section', title: 'Section', collapsible: true, collapsed: false, input: false, components: [] }) },
  { type: 'table', label: 'Table', hint: 'Grid of fields; scrolls on phones', group: 'layout', make: () => ({ type: 'table', key: 'table', label: 'Table', input: false, rows: [[{ components: [] }, { components: [] }], [{ components: [] }, { components: [] }]] }) },
  { type: 'tabs', label: 'Tabs', hint: 'Tabs on desktop, accordion on phones', group: 'layout', make: () => ({ type: 'tabs', key: 'tabs', label: 'Tabs', input: false, components: [{ type: 'tab', key: 'tab1', label: 'Tab 1', input: false, components: [] }, { type: 'tab', key: 'tab2', label: 'Tab 2', input: false, components: [] }] }) },
  { type: 'well', label: 'Well', hint: 'Shaded grouping box', group: 'layout', make: () => ({ type: 'well', key: 'well', label: 'Well', input: false, components: [] }) },

  { type: 'datasource', label: 'Data Source', hint: 'Static options for other fields', group: 'premium', make: () => input('datasource', 'Data Source', { input: false, values: choices() }) },
  { type: 'captcha', label: 'CAPTCHA', hint: 'Simple human check (no Google key)', group: 'premium', make: () => input('captcha', 'Human check', { content: 'Type YES to confirm you are a person.' }) },
  { type: 'file', label: 'File', hint: 'Upload a photo or PDF', group: 'premium', make: () => input('file', 'File') },
  { type: 'form', label: 'Nested Form', hint: 'Embed another published form', group: 'premium', make: () => input('form', 'Nested form', { input: false, form: '' }) },
  { type: 'tagpad', label: 'Tagpad', hint: 'Tap an image to drop tags', group: 'premium', make: () => input('tagpad', 'Tagpad') },
  { type: 'sketchpad', label: 'Sketchpad', hint: 'Draw on a canvas', group: 'premium', make: () => input('sketchpad', 'Sketchpad') },
  { type: 'reviewpage', label: 'Review Page', hint: 'Show answers before submit', group: 'premium', make: () => input('reviewpage', 'Review', { input: false }) },
  { type: 'custom', label: 'Custom', hint: 'Note or custom JSON block', group: 'premium', make: () => ({ type: 'custom', key: 'custom', label: 'Custom', input: false, content: '' }) },
  { type: 'datatable', label: 'Data Table', hint: 'Read-only rows from options', group: 'premium', make: () => input('datatable', 'Data Table', { input: false, values: choices() }) },
  { type: 'dynamicWizard', label: 'Dynamic Wizard', hint: 'One repeating item at a time', group: 'premium', make: () => input('dynamicWizard', 'Wizard', { input: false, components: [input('textfield', 'Item')] }) },
];

export const GROUP_LABEL: Record<PaletteGroup, string> = {
  homepage: 'Dashboard cards',
  basic: 'Basic',
  advanced: 'Advanced',
  data: 'Data',
  layout: 'Layout',
  premium: 'Premium',
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
