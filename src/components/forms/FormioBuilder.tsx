import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FormioRenderer } from '@/components/forms/FormioRenderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { FormioComponent, FormioSchema } from '@/types/api';

const PALETTE: Array<{ label: string; make: () => FormioComponent }> = [
  { label: 'Short text', make: () => field('textfield', 'Short text') },
  { label: 'Long text', make: () => field('textarea', 'Long text') },
  { label: 'Email', make: () => field('email', 'Email') },
  { label: 'Phone', make: () => field('phoneNumber', 'Phone') },
  { label: 'Number', make: () => field('number', 'Number') },
  { label: 'Yes/No', make: () => field('checkbox', 'Yes / no') },
  {
    label: 'Dropdown',
    make: () => ({
      ...field('select', 'Dropdown'),
      values: defaultChoices(),
    }),
  },
  {
    label: 'Multiple choice',
    make: () => ({
      ...field('radio', 'Multiple choice'),
      values: defaultChoices(),
    }),
  },
  { label: 'Date', make: () => field('datetime', 'Date') },
  {
    label: 'Heading/note',
    make: () => ({
      type: 'content',
      key: 'note',
      label: 'Note',
      input: false,
      content: 'Add a short instruction for the client.',
    }),
  },
];

function field(type: string, label: string): FormioComponent {
  return {
    type,
    key: slug(label),
    label,
    input: true,
    placeholder: '',
    validate: { required: false },
  };
}

function defaultChoices() {
  return [
    { label: 'Option 1', value: 'option_1' },
    { label: 'Option 2', value: 'option_2' },
  ];
}

function slug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field';
}

function uniqueKey(label: string, existing: string[]) {
  const base = slug(label);
  if (!existing.includes(base)) return base;
  let index = 2;
  while (existing.includes(`${base}_${index}`)) index += 1;
  return `${base}_${index}`;
}

export function FormioBuilder({
  schema,
  onChange,
}: {
  schema: FormioSchema;
  onChange: (s: FormioSchema) => void;
}) {
  const components = schema.components ?? [];
  const [preview, setPreview] = useState<Record<string, unknown>>({});

  const setComponents = (next: FormioComponent[]) =>
    onChange({ display: 'form', components: next });

  const add = (template: FormioComponent) => {
    const keys = components.map((component) => component.key).filter((key): key is string => Boolean(key));
    const key = uniqueKey(template.label || template.type, keys);
    setComponents([...components, { ...template, key }]);
  };

  const update = (index: number, patch: Partial<FormioComponent>) => {
    setComponents(components.map((component, i) => (i === index ? { ...component, ...patch } : component)));
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= components.length) return;
    const copy = [...components];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    setComponents(copy);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-stone-500">Add a field</p>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((item) => (
              <Button key={item.label} type="button" size="sm" variant="outline" onClick={() => add(item.make())}>
                <Plus className="h-3.5 w-3.5" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        {components.length === 0 ? (
          <p className="text-sm text-stone-500">
            Add fields from the buttons above. Start with name, phone, and a yes/no waiver.
          </p>
        ) : null}
        {components.map((component, index) => (
          <div key={`${component.key}-${index}`} className="space-y-3 rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium capitalize">{paletteName(component.type)}</p>
              <div className="flex items-center gap-1">
                <Button type="button" size="icon" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => move(index, 1)}
                  disabled={index === components.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setComponents(components.filter((_, i) => i !== index))}
                  aria-label="Delete field"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Label</Label>
              <Input value={component.label ?? ''} onChange={(event) => update(index, { label: event.target.value })} />
            </div>
            {component.type !== 'content' && component.type !== 'checkbox' ? (
              <div>
                <Label>Placeholder</Label>
                <Input
                  value={component.placeholder ?? ''}
                  onChange={(event) => update(index, { placeholder: event.target.value })}
                />
              </div>
            ) : null}
            {component.type === 'content' ? (
              <div>
                <Label>Note</Label>
                <Textarea
                  value={component.content ?? ''}
                  onChange={(event) => update(index, { content: event.target.value })}
                />
              </div>
            ) : null}
            {component.type === 'select' || component.type === 'radio' ? (
              <div>
                <Label>Choices (one per line)</Label>
                <Textarea
                  value={(component.values ?? []).map((option) => option.label).join('\n')}
                  onChange={(event) =>
                    update(index, {
                      values: event.target.value
                        .split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => ({ label: line, value: slug(line) })),
                    })
                  }
                />
              </div>
            ) : null}
            {component.input !== false && component.type !== 'content' ? (
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={Boolean(component.validate?.required)}
                  onCheckedChange={(required) => update(index, { validate: { ...component.validate, required } })}
                />
                Required
              </label>
            ) : null}
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-dashed border-stone-300 p-4 dark:border-stone-700">
        <p className="mb-4 text-sm font-medium text-stone-500">Live preview</p>
        {components.length === 0 ? (
          <p className="text-sm text-stone-500">Fields you add will show here as the client will see them.</p>
        ) : (
          <FormioRenderer schema={{ display: 'form', components }} value={preview} onChange={setPreview} />
        )}
      </div>
    </div>
  );
}

function paletteName(type: string) {
  const names: Record<string, string> = {
    textfield: 'Short text',
    textarea: 'Long text',
    email: 'Email',
    phoneNumber: 'Phone',
    number: 'Number',
    checkbox: 'Yes/No',
    select: 'Dropdown',
    radio: 'Multiple choice',
    datetime: 'Date',
    content: 'Heading/note',
    htmlelement: 'Heading/note',
    panel: 'Section',
  };
  return names[type] ?? type;
}
