import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { FormioComponent, FormioSchema } from '@/types/api';

export function FormioRenderer({
  schema,
  value,
  onChange,
  disabled,
}: {
  schema: FormioSchema;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  disabled?: boolean;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const setField = (key: string, next: unknown) => onChange({ ...value, [key]: next });

  return (
    <div className="space-y-4">
      {(schema.components ?? []).map((component, index) => (
        <FormioField
          key={component.key || `${component.type}-${index}`}
          component={component}
          value={value}
          setField={setField}
          disabled={disabled}
          touched={touched}
          onBlurField={(key) => setTouched((current) => ({ ...current, [key]: true }))}
        />
      ))}
    </div>
  );
}

function FormioField({
  component,
  value,
  setField,
  disabled,
  touched,
  onBlurField,
}: {
  component: FormioComponent;
  value: Record<string, unknown>;
  setField: (key: string, next: unknown) => void;
  disabled?: boolean;
  touched: Record<string, boolean>;
  onBlurField: (key: string) => void;
}) {
  const key = component.key || component.label || component.type;
  const current = value[key];
  const required = Boolean(component.validate?.required);
  const showError = required && Boolean(touched[key]) && isEmpty(current);
  const options = component.values ?? [];

  if (component.type === 'content' || component.type === 'htmlelement') {
    const body = component.content || component.label;
    if (!body) return null;
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-300">
        <p className="whitespace-pre-wrap font-medium">{component.label && component.content ? component.label : null}</p>
        <p className={cn('whitespace-pre-wrap', component.label && component.content ? 'mt-1' : undefined)}>
          {body}
        </p>
      </div>
    );
  }

  if (component.type === 'panel') {
    return (
      <div className="space-y-3 rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
        {component.label ? <p className="font-medium">{component.label}</p> : null}
        {(component.components ?? []).map((child, index) => (
          <FormioField
            key={child.key || `${child.type}-${index}`}
            component={child}
            value={value}
            setField={setField}
            disabled={disabled}
            touched={touched}
            onBlurField={onBlurField}
          />
        ))}
      </div>
    );
  }

  if (component.type === 'checkbox') {
    return (
      <div className="space-y-1">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-stone-300"
            disabled={disabled}
            checked={Boolean(current)}
            onChange={(event) => setField(key, event.target.checked)}
            onBlur={() => onBlurField(key)}
          />
          <span>
            {component.label || key}
            {required ? <span className="text-red-600"> *</span> : null}
          </span>
        </label>
        {showError ? <p className="text-xs text-red-600">This field is required</p> : null}
      </div>
    );
  }

  const label = (
    <Label>
      {component.label || key}
      {required ? <span className="text-red-600"> *</span> : null}
    </Label>
  );

  if (component.type === 'textarea') {
    return (
      <div className="space-y-1">
        {label}
        <Textarea
          disabled={disabled}
          placeholder={component.placeholder}
          value={stringValue(current)}
          onChange={(event) => setField(key, event.target.value)}
          onBlur={() => onBlurField(key)}
          className={showError ? 'border-red-400' : undefined}
        />
        {showError ? <p className="text-xs text-red-600">This field is required</p> : null}
      </div>
    );
  }

  if (component.type === 'select') {
    return (
      <div className="space-y-1">
        {label}
        <select
          disabled={disabled}
          className={cn(
            'h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-950',
            showError && 'border-red-400',
          )}
          value={stringValue(current)}
          onChange={(event) => setField(key, event.target.value)}
          onBlur={() => onBlurField(key)}
        >
          <option value="">{component.placeholder || 'Select…'}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {showError ? <p className="text-xs text-red-600">This field is required</p> : null}
      </div>
    );
  }

  if (component.type === 'radio') {
    return (
      <fieldset className="space-y-2" onBlur={() => onBlurField(key)}>
        {label}
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              disabled={disabled}
              name={key}
              value={option.value}
              checked={current === option.value}
              onChange={() => setField(key, option.value)}
            />
            {option.label}
          </label>
        ))}
        {showError ? <p className="text-xs text-red-600">This field is required</p> : null}
      </fieldset>
    );
  }

  const inputType =
    component.type === 'email'
      ? 'email'
      : component.type === 'number'
        ? 'number'
        : component.type === 'datetime'
          ? 'date'
          : component.type === 'phoneNumber'
            ? 'tel'
            : 'text';

  return (
    <div className="space-y-1">
      {label}
      <Input
        type={inputType}
        disabled={disabled}
        placeholder={component.placeholder}
        value={stringValue(current)}
        onChange={(event) =>
          setField(key, inputType === 'number' ? toNumber(event.target.value) : event.target.value)
        }
        onBlur={() => onBlurField(key)}
        className={showError ? 'border-red-400' : undefined}
      />
      {showError ? <p className="text-xs text-red-600">This field is required</p> : null}
    </div>
  );
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'boolean') return value === false;
  if (typeof value === 'number') return Number.isNaN(value);
  return String(value).trim() === '';
}

function stringValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value);
}

function toNumber(raw: string): unknown {
  if (raw.trim() === '') return '';
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? raw : parsed;
}
