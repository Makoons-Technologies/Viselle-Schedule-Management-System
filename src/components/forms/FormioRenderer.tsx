import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CollapsibleBox, ResponsiveTable, ResponsiveTabs, columnsClass } from '@/components/builder/ResponsiveLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Textarea } from '@/components/ui/textarea';
import { orgApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { FormioComponent, FormioSchema } from '@/types/api';

export function FormioRenderer({
  schema,
  value,
  onChange,
  disabled,
  orgId,
}: {
  schema: FormioSchema;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  disabled?: boolean;
  orgId?: string;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-4">
      {(schema.components ?? []).map((component, index) => (
        <FormioField
          key={component.key || `${component.type}-${index}`}
          component={component}
          value={value}
          setField={(key, next) => onChange({ ...value, [key]: next })}
          disabled={disabled}
          touched={touched}
          onBlurField={(key) => setTouched((current) => ({ ...current, [key]: true }))}
          orgId={orgId}
        />
      ))}
    </div>
  );
}

function FormioField(props: {
  component: FormioComponent;
  value: Record<string, unknown>;
  setField: (key: string, next: unknown) => void;
  disabled?: boolean;
  touched: Record<string, boolean>;
  onBlurField: (key: string) => void;
  orgId?: string;
}) {
  const { component, value, setField, disabled, touched, onBlurField, orgId } = props;
  const type = normalizeType(component.type);
  const key = component.key || component.label || component.type;
  const current = value[key];
  const required = Boolean(component.validate?.required);
  const showError = required && Boolean(touched[key]) && isEmpty(current);
  const options = component.values ?? component.data?.values ?? [];
  const kids = component.components ?? [];

  const renderKids = (list: FormioComponent[], bag: Record<string, unknown>, write: (next: Record<string, unknown>) => void) =>
    list.map((child, index) => (
      <FormioField
        key={child.key || `${child.type}-${index}`}
        component={child}
        value={bag}
        setField={(childKey, next) => write({ ...bag, [childKey]: next })}
        disabled={disabled}
        touched={touched}
        onBlurField={onBlurField}
        orgId={orgId}
      />
    ));

  if (type === 'hidden' || type === 'datasource') return null;
  if (type === 'button') return null;

  if (type === 'content' || type === 'htmlelement' || type === 'custom') {
    const body = component.content || component.html || component.label;
    if (!body) return null;
    return <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm whitespace-pre-wrap dark:border-stone-800 dark:bg-stone-950/40">{body}</div>;
  }

  if (type === 'well' || type === 'panel' || type === 'fieldset' || type === 'container') {
    const nestedValue = type === 'container' ? asRecord(current) ?? {} : value;
    const write = type === 'container' ? (next: Record<string, unknown>) => setField(key, next) : (next: Record<string, unknown>) => {
      Object.entries(next).forEach(([childKey, childValue]) => setField(childKey, childValue));
    };
    return (
      <CollapsibleBox title={component.title || component.legend || component.label} collapsible={component.collapsible}>
        <div className="grid grid-cols-1 gap-4">{renderKids(kids, nestedValue, write)}</div>
      </CollapsibleBox>
    );
  }

  if (type === 'columns') {
    const columns = component.columns?.length ? component.columns : [{ components: kids }];
    return (
      <div className={columnsClass(columns.length)}>
        {columns.map((column, index) => (
          <div key={index} className="min-w-0 space-y-4">
            {column.components?.map((child, childIndex) => (
              <FormioField key={child.key || `${index}-${childIndex}`} component={child} value={value} setField={setField} disabled={disabled} touched={touched} onBlurField={onBlurField} orgId={orgId} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'tabs') {
    const tabs = kids.length ? kids : [{ key: 'tab1', label: 'Tab 1', type: 'tab', components: [] }];
    return (
      <ResponsiveTabs tabs={tabs}>
        {(open) =>
          (tabs[open]?.components ?? []).map((child, index) => (
            <FormioField key={child.key || index} component={child} value={value} setField={setField} disabled={disabled} touched={touched} onBlurField={onBlurField} orgId={orgId} />
          ))
        }
      </ResponsiveTabs>
    );
  }

  if (type === 'table') {
    const rows = component.rows ?? [];
    return (
      <ResponsiveTable
        rows={rows}
        renderCell={(rowIndex, cellIndex) =>
          rows[rowIndex]?.[cellIndex]?.components?.map((child, index) => (
            <FormioField key={child.key || index} {...props} component={child} />
          ))
        }
      />
    );
  }

  if (type === 'datagrid' || type === 'editgrid' || type === 'dynamicWizard') {
    return (
      <Repeat
        label={component.label || 'Items'}
        components={kids}
        rows={Array.isArray(current) ? (current as Record<string, unknown>[]) : []}
        onChange={(rows) => setField(key, rows)}
        disabled={disabled}
        wizard={type === 'dynamicWizard'}
        orgId={orgId}
      />
    );
  }

  if (type === 'datamap') {
    const pairs = asPairs(current);
    return (
      <div className="space-y-2">
        {fieldLabel(component.label, required)}
        {pairs.map((pair, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input disabled={disabled} placeholder="Key" value={pair[0]} onChange={(event) => setField(key, replacePair(pairs, index, [event.target.value, pair[1]]))} />
            <Input disabled={disabled} placeholder="Value" value={pair[1]} onChange={(event) => setField(key, replacePair(pairs, index, [pair[0], event.target.value]))} />
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => setField(key, [...pairs, ['', '']])}>
          Add pair
        </Button>
      </div>
    );
  }

  if (type === 'form' || type === 'resource') {
    return <EmbeddedForm orgId={orgId} formId={String(component.form || component.formId || '')} value={asRecord(current) ?? {}} onChange={(next) => setField(key, next)} disabled={disabled} />;
  }

  if (type === 'reviewpage') {
    return (
      <div className="space-y-2 rounded-xl border border-stone-200 p-4 text-sm dark:border-stone-800">
        <p className="font-medium">{component.label || 'Review'}</p>
        {Object.entries(value).map(([name, answer]) => (
          <div key={name} className="flex justify-between gap-3">
            <span className="text-stone-500">{name}</span>
            <span className="break-all text-right">{formatValue(answer)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'datatable') {
    return (
      <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
        <table className="w-full min-w-[20rem] text-sm">
          <tbody>
            {options.map((option) => (
              <tr key={option.value} className="border-t border-stone-100 dark:border-stone-800">
                <td className="px-3 py-2">{option.label}</td>
                <td className="px-3 py-2 text-stone-500">{option.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'checkbox') {
    return (
      <div className="space-y-1">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 rounded border-stone-300" disabled={disabled} checked={Boolean(current)} onChange={(event) => setField(key, event.target.checked)} onBlur={() => onBlurField(key)} />
          <span>
            {component.label || key}
            {required ? <span className="text-red-600"> *</span> : null}
          </span>
        </label>
        {errorText(showError)}
      </div>
    );
  }

  if (type === 'selectboxes') {
    const selected = asRecord(current) ?? {};
    return (
      <fieldset className="space-y-2">
        {fieldLabel(component.label, required)}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled={disabled} checked={Boolean(selected[option.value])} onChange={(event) => setField(key, { ...selected, [option.value]: event.target.checked })} />
              {option.label}
            </label>
          ))}
        </div>
        {errorText(showError)}
      </fieldset>
    );
  }

  if (type === 'select') {
    return (
      <div className="space-y-1">
        {fieldLabel(component.label, required)}
        <select disabled={disabled} className={cn('h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-950', showError && 'border-red-400')} value={str(current)} onChange={(event) => setField(key, event.target.value)} onBlur={() => onBlurField(key)}>
          <option value="">{component.placeholder || 'Select…'}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {errorText(showError)}
      </div>
    );
  }

  if (type === 'radio') {
    return (
      <fieldset className="space-y-2" onBlur={() => onBlurField(key)}>
        {fieldLabel(component.label, required)}
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input type="radio" disabled={disabled} name={key} checked={current === option.value} onChange={() => setField(key, option.value)} />
            {option.label}
          </label>
        ))}
        {errorText(showError)}
      </fieldset>
    );
  }

  if (type === 'textarea') {
    return (
      <div className="space-y-1">
        {fieldLabel(component.label, required)}
        <Textarea disabled={disabled} placeholder={component.placeholder} value={str(current)} onChange={(event) => setField(key, event.target.value)} onBlur={() => onBlurField(key)} className={showError ? 'border-red-400' : undefined} />
        {errorText(showError)}
      </div>
    );
  }

  if (type === 'survey') {
    const answers = asRecord(current) ?? {};
    return (
      <div className="space-y-3">
        {fieldLabel(component.label, required)}
        {(component.questions ?? []).map((question) => (
          <div key={question.value} className="rounded-xl border border-stone-200 p-3 dark:border-stone-800">
            <p className="mb-2 text-sm font-medium">{question.label}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {options.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <input type="radio" disabled={disabled} checked={answers[question.value] === option.value} onChange={() => setField(key, { ...answers, [question.value]: option.value })} />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'address') {
    const address = asRecord(current) ?? {};
    return (
      <div className="space-y-2">
        {fieldLabel(component.label, required)}
        <Input disabled={disabled} placeholder="Street" value={str(address.street)} onChange={(event) => setField(key, { ...address, street: event.target.value })} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Input disabled={disabled} placeholder="City" value={str(address.city)} onChange={(event) => setField(key, { ...address, city: event.target.value })} />
          <Input disabled={disabled} placeholder="State" value={str(address.state)} onChange={(event) => setField(key, { ...address, state: event.target.value })} />
          <Input disabled={disabled} placeholder="ZIP" value={str(address.zip)} onChange={(event) => setField(key, { ...address, zip: event.target.value })} />
        </div>
      </div>
    );
  }

  if (type === 'tags') {
    return <TagEditor label={component.label} required={required} tags={Array.isArray(current) ? current.map(String) : []} disabled={disabled} error={showError} onChange={(tags) => setField(key, tags)} />;
  }

  if (type === 'signature' || type === 'sketchpad') {
    return <DrawCanvas label={component.label || (type === 'signature' ? 'Signature' : 'Sketch')} value={str(current)} disabled={disabled} onChange={(next) => setField(key, next)} />;
  }

  if (type === 'tagpad') {
    const points = Array.isArray(current) ? (current as Array<{ x: number; y: number }>) : [];
    return (
      <button
        type="button"
        disabled={disabled}
        className="relative min-h-40 w-full rounded-xl border border-dashed border-stone-300 bg-stone-50 dark:border-stone-700 dark:bg-stone-950"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setField(key, [...points, { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }]);
        }}
      >
        <span className="absolute left-3 top-3 text-xs text-stone-500">Tap to tag</span>
        {points.map((point, index) => (
          <span key={index} className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} />
        ))}
      </button>
    );
  }

  if (type === 'captcha') {
    const ok = str(current).toUpperCase() === 'YES';
    return (
      <div className="space-y-1">
        {fieldLabel(component.label, true)}
        <p className="text-sm text-stone-500">{component.content || 'Type YES to confirm you are a person.'}</p>
        <Input disabled={disabled} value={str(current)} onChange={(event) => setField(key, event.target.value)} onBlur={() => onBlurField(key)} />
        {touched[key] && !ok ? <p className="text-xs text-red-600">Type YES to continue</p> : null}
      </div>
    );
  }

  if (type === 'file') {
    const file = asRecord(current);
    return (
      <div className="space-y-1">
        {fieldLabel(component.label, required)}
        <Input type="file" disabled={disabled} onChange={(event) => {
          const picked = event.target.files?.[0];
          if (!picked) return;
          const reader = new FileReader();
          reader.onload = () => setField(key, { name: picked.name, dataUrl: String(reader.result ?? '') });
          reader.readAsDataURL(picked);
        }} />
        {file?.name ? <p className="text-xs text-stone-500">{String(file.name)}</p> : null}
      </div>
    );
  }

  if (type === 'day') {
    const [year = '', month = '', day = ''] = str(current).split('-');
    return (
      <div className="space-y-1">
        {fieldLabel(component.label, required)}
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="MM" disabled={disabled} value={month} onChange={(event) => setField(key, `${year}-${event.target.value}-${day}`)} />
          <Input placeholder="DD" disabled={disabled} value={day} onChange={(event) => setField(key, `${year}-${month}-${event.target.value}`)} />
          <Input placeholder="YYYY" disabled={disabled} value={year} onChange={(event) => setField(key, `${event.target.value}-${month}-${day}`)} />
        </div>
      </div>
    );
  }

  const inputType =
    type === 'email' ? 'email'
    : type === 'number' || type === 'currency' ? 'number'
    : type === 'datetime' ? 'datetime-local'
    : type === 'time' ? 'time'
    : type === 'url' ? 'url'
    : type === 'phoneNumber' ? 'tel'
    : type === 'password' ? 'password'
    : 'text';

  return (
    <div className="space-y-1">
      {fieldLabel(component.label, required)}
      {type === 'password' ? (
        <PasswordInput disabled={disabled} placeholder={component.placeholder} value={str(current)} onChange={(event) => setField(key, event.target.value)} onBlur={() => onBlurField(key)} className={showError ? 'border-red-400' : undefined} />
      ) : (
        <Input type={inputType} disabled={disabled} placeholder={component.placeholder} value={str(current)} onChange={(event) => setField(key, inputType === 'number' ? toNumber(event.target.value) : event.target.value)} onBlur={() => onBlurField(key)} className={showError ? 'border-red-400' : undefined} />
      )}
      {errorText(showError)}
    </div>
  );
}

function Repeat({
  label,
  components,
  rows,
  onChange,
  disabled,
  wizard,
  orgId,
}: {
  label: string;
  components: FormioComponent[];
  rows: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
  disabled?: boolean;
  wizard?: boolean;
  orgId?: string;
}) {
  const [index, setIndex] = useState(0);
  const actualRows = wizard ? rows.slice(Math.min(index, Math.max(rows.length - 1, 0)), Math.min(index, Math.max(rows.length - 1, 0)) + 1) : rows;
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      {actualRows.map((row, rowIndex) => {
        const actual = wizard ? index : rowIndex;
        return (
          <div key={actual} className="space-y-3 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {components.map((child, childIndex) => (
                <FormioField
                  key={child.key || childIndex}
                  component={child}
                  value={row}
                  setField={(key, next) => onChange(rows.map((item, i) => (i === actual ? { ...item, [key]: next } : item)))}
                  disabled={disabled}
                  touched={{}}
                  onBlurField={() => undefined}
                  orgId={orgId}
                />
              ))}
            </div>
            <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(rows.filter((_, i) => i !== actual))}>Remove</Button>
          </div>
        );
      })}
      {wizard && rows.length > 1 ? (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>Back</Button>
          <Button type="button" size="sm" variant="outline" disabled={index >= rows.length - 1} onClick={() => setIndex((value) => value + 1)}>Next</Button>
        </div>
      ) : null}
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChange([...rows, {}])}>Add row</Button>
    </div>
  );
}

function EmbeddedForm({ orgId, formId, value, onChange, disabled }: { orgId?: string; formId: string; value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void; disabled?: boolean }) {
  const query = useQuery({
    queryKey: ['form', orgId, formId],
    queryFn: () => orgApi.getForm(orgId!, formId),
    enabled: Boolean(orgId && formId),
  });
  if (!formId) return <p className="text-sm text-stone-500">Choose a published form to embed.</p>;
  if (query.isLoading) return <p className="text-sm text-stone-500">Loading form…</p>;
  const schema = query.data?.form.schema;
  if (!schema) return <p className="text-sm text-stone-500">Form not found.</p>;
  return <FormioRenderer schema={schema} value={value} onChange={onChange} disabled={disabled} orgId={orgId} />;
}

function TagEditor({ label, required, tags, onChange, disabled, error }: { label?: string; required?: boolean; tags: string[]; onChange: (tags: string[]) => void; disabled?: boolean; error?: boolean }) {
  const [draft, setDraft] = useState('');
  return (
    <div className="space-y-1">
      {fieldLabel(label, required)}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button key={tag} type="button" disabled={disabled} className="rounded-full bg-stone-100 px-2 py-1 text-xs dark:bg-stone-800" onClick={() => onChange(tags.filter((item) => item !== tag))}>
            {tag} ×
          </button>
        ))}
      </div>
      <Input disabled={disabled} value={draft} placeholder="Type and press Enter" className={error ? 'border-red-400' : undefined} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const next = draft.trim();
        if (next) onChange([...tags, next]);
        setDraft('');
      }} />
    </div>
  );
}

function DrawCanvas({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    const image = new Image();
    image.onload = () => canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = value;
  }, [value]);
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * canvas.width, y: ((event.clientY - rect.top) / rect.height) * canvas.height };
  };
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <canvas
        ref={canvasRef}
        width={480}
        height={180}
        className="h-36 w-full touch-none rounded-xl border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-950"
        onPointerDown={(event) => {
          if (disabled) return;
          drawing.current = true;
          const next = point(event);
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && next) { ctx.beginPath(); ctx.moveTo(next.x, next.y); }
        }}
        onPointerMove={(event) => {
          if (!drawing.current || disabled) return;
          const next = point(event);
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && next) { ctx.lineTo(next.x, next.y); ctx.stroke(); }
        }}
        onPointerUp={() => {
          drawing.current = false;
          if (canvasRef.current) onChange(canvasRef.current.toDataURL());
        }}
      />
    </div>
  );
}

function fieldLabel(label?: string, required?: boolean) {
  if (!label) return null;
  return <Label>{label}{required ? <span className="text-red-600"> *</span> : null}</Label>;
}

function errorText(show: boolean) {
  return show ? <p className="text-xs text-red-600">This field is required</p> : null;
}

function normalizeType(type: string) {
  if (type === 'textfield' || type === 'text') return 'textfield';
  if (type === 'phone') return 'phoneNumber';
  if (type === 'selectboxes') return 'selectboxes';
  if (type === 'htmlelement') return 'htmlelement';
  if (type === 'editgrid') return 'editgrid';
  if (type === 'datagrid') return 'datagrid';
  if (type === 'datamap') return 'datamap';
  if (type === 'sketchpad') return 'sketchpad';
  if (type === 'tagpad') return 'tagpad';
  if (type === 'reviewpage') return 'reviewpage';
  if (type === 'datatable') return 'datatable';
  if (type === 'dynamicWizard') return 'dynamicWizard';
  return type;
}

function isEmpty(value: unknown) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'boolean') return value === false;
  if (typeof value === 'number') return Number.isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return String(value).trim() === '';
}

function str(value: unknown) {
  return value == null ? '' : String(value);
}

function toNumber(raw: string) {
  if (raw.trim() === '') return '';
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? raw : parsed;
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asPairs(value: unknown): Array<[string, string]> {
  if (Array.isArray(value)) return value.map((item) => (Array.isArray(item) ? [String(item[0] ?? ''), String(item[1] ?? '')] : ['', '']));
  if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]);
  return [['', '']];
}

function replacePair(pairs: Array<[string, string]>, index: number, next: [string, string]) {
  return pairs.map((pair, i) => (i === index ? next : pair));
}

function formatValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value == null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function collectRequiredGaps(schema: FormioSchema, value: Record<string, unknown>): string[] {
  const missing: string[] = [];
  const visit = (components: FormioComponent[], bag: Record<string, unknown>) => {
    for (const component of components) {
      const type = normalizeType(component.type);
      if (component.columns) for (const column of component.columns) visit(column.components ?? [], bag);
      if (component.rows) for (const row of component.rows) for (const cell of row) visit(cell.components ?? [], bag);
      if (component.components && ['panel', 'fieldset', 'well', 'container', 'tabs', 'tab'].includes(type)) {
        visit(component.components, type === 'container' && component.key ? asRecord(bag[component.key]) ?? {} : bag);
        continue;
      }
      if (component.components) visit(component.components, bag);
      if (!component.input || !component.validate?.required || !component.key) continue;
      if (isEmpty(bag[component.key])) missing.push(component.label || component.key);
    }
  };
  visit(schema.components ?? [], value);
  return missing;
}
