import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FormioRenderer } from '@/components/forms/FormioRenderer';
import { GROUP_LABEL, PALETTE, allKeys, cloneComponent, isLayoutType, paletteFor, paletteLabel } from '@/components/builder/palette';
import { componentAt, insertAt, parseDrop, parentPath, removeAt, reorder, updateAt } from '@/components/builder/schemaTree';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { FormioComponent, FormioSchema, OrgForm, Service } from '@/types/api';

export function FormioBuilder({
  schema,
  onChange,
  mode = 'form',
  orgId,
  forms = [],
  services = [],
}: {
  schema: FormioSchema;
  onChange: (schema: FormioSchema) => void;
  mode?: 'form' | 'homepage';
  orgId?: string;
  forms?: OrgForm[];
  services?: Service[];
}) {
  const components = schema.components ?? [];
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const palette = paletteFor(mode);
  const selected = selectedPath ? componentAt(components, selectedPath) : null;

  const setComponents = (next: FormioComponent[]) => onChange({ ...schema, components: next });

  const onDragEnd = (event: DragEndEvent) => {
    const overId = String(event.over?.id ?? '');
    const activeId = String(event.active.id);
    if (!overId) return;
    const target = parseDrop(overId);
    if (!target) return;
    if (activeId.startsWith('palette:')) {
      const type = activeId.replace('palette:', '');
      const item = palette.find((entry) => entry.type === type);
      if (!item) return;
      const created = cloneComponent(item, allKeys(components));
      setComponents(insertAt(components, target, created));
      return;
    }
    if (activeId.startsWith('item:') && overId.startsWith('item:')) {
      const fromPath = activeId.replace('item:', '');
      const toPath = overId.replace('item:', '');
      const fromParent = parentPath(fromPath);
      const toParent = parentPath(toPath);
      if (fromParent !== toParent) return;
      const fromIndex = Number(fromPath.split('.').pop());
      const toIndex = Number(toPath.split('.').pop());
      setComponents(reorder(components, fromParent, fromIndex, toIndex));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="max-h-[70vh] space-y-4 overflow-y-auto rounded-2xl border border-stone-200 p-3 dark:border-stone-800">
          <p className="text-sm font-medium">Drag onto the canvas</p>
          {(Object.keys(GROUP_LABEL) as Array<keyof typeof GROUP_LABEL>).filter((group) => palette.some((item) => item.group === group)).map((group) => (
            <div key={group}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{GROUP_LABEL[group]}</p>
              <div className="space-y-1">
                {palette.filter((item) => item.group === group).map((item) => (
                  <PaletteChip key={item.type} item={item} />
                ))}
              </div>
            </div>
          ))}
        </aside>
        <div className="space-y-4">
          <CanvasList
            id="root"
            components={components}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            onRemove={(path) => {
              setComponents(removeAt(components, path));
              setSelectedPath(null);
            }}
          />
          <div className="rounded-2xl border border-dashed border-stone-300 p-4 dark:border-stone-700">
            <p className="mb-3 text-sm font-medium text-stone-500">Phone preview</p>
            <div className="mx-auto w-full max-w-sm rounded-3xl border border-stone-200 p-4 dark:border-stone-800">
              <FormioRenderer schema={schema} value={preview} onChange={setPreview} orgId={orgId} />
            </div>
          </div>
        </div>
        <Inspector
          selected={selected}
          selectedPath={selectedPath}
          forms={forms}
          services={services}
          mode={mode}
          onChange={(patch) => selectedPath && setComponents(updateAt(components, selectedPath, patch))}
        />
      </div>
    </DndContext>
  );
}

function PaletteChip({ item }: { item: (typeof PALETTE)[number] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `palette:${item.type}` });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn('w-full rounded-lg border border-stone-200 px-2 py-1.5 text-left text-sm hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900', isDragging && 'opacity-60')}
      title={item.hint}
    >
      {item.label}
    </button>
  );
}

function CanvasList({
  id,
  components,
  selectedPath,
  onSelect,
  onRemove,
  pathPrefix = '',
}: {
  id: string;
  components: FormioComponent[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onRemove: (path: string) => void;
  pathPrefix?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `zone:${id}` });
  const itemIds = components.map((_, index) => `item:${pathPrefix}${index}`);
  return (
    <div ref={setNodeRef} className={cn('min-h-24 space-y-2 rounded-2xl border border-dashed p-3', isOver ? 'border-brand-500 bg-brand-50/40' : 'border-stone-300 dark:border-stone-700')}>
      {components.length === 0 ? <p className="text-sm text-stone-500">Drop a component here.</p> : null}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {components.map((component, index) => {
          const path = `${pathPrefix}${index}`;
          return (
            <SortableItem key={component.key || path} id={`item:${path}`} selected={selectedPath === path} onSelect={() => onSelect(path)} onRemove={() => onRemove(path)} label={`${paletteLabel(component.type)}${component.label ? ` · ${component.label}` : ''}`}>
              {isLayoutType(component.type) ? (
                <NestedZones component={component} path={path} selectedPath={selectedPath} onSelect={onSelect} onRemove={onRemove} />
              ) : null}
            </SortableItem>
          );
        })}
      </SortableContext>
    </div>
  );
}

function NestedZones({
  component,
  path,
  selectedPath,
  onSelect,
  onRemove,
}: {
  component: FormioComponent;
  path: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onRemove: (path: string) => void;
}) {
  if (component.columns) {
    return (
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        {component.columns.map((column, index) => (
          <CanvasList key={index} id={`${path}-col-${index}`} pathPrefix={`${path}.c${index}.`} components={column.components ?? []} selectedPath={selectedPath} onSelect={onSelect} onRemove={onRemove} />
        ))}
      </div>
    );
  }
  if (component.type === 'tabs') {
    return (
      <div className="mt-2 space-y-2">
        {(component.components ?? []).map((tab, index) => (
          <div key={tab.key || index}>
            <p className="mb-1 text-xs text-stone-500">{tab.label || `Tab ${index + 1}`}</p>
            <CanvasList id={`${path}-tab-${index}`} pathPrefix={`${path}.${index}.`} components={tab.components ?? []} selectedPath={selectedPath} onSelect={onSelect} onRemove={onRemove} />
          </div>
        ))}
      </div>
    );
  }
  if (component.rows) {
    return (
      <div className="mt-2 space-y-2">
        {component.rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {row.map((cell, cellIndex) => (
              <CanvasList key={cellIndex} id={`${path}-cell-${rowIndex}-${cellIndex}`} pathPrefix={`${path}.r${rowIndex}c${cellIndex}.`} components={cell.components ?? []} selectedPath={selectedPath} onSelect={onSelect} onRemove={onRemove} />
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-2">
      <CanvasList id={`${path}-kids`} pathPrefix={`${path}.`} components={component.components ?? []} selectedPath={selectedPath} onSelect={onSelect} onRemove={onRemove} />
    </div>
  );
}

function SortableItem({
  id,
  selected,
  onSelect,
  onRemove,
  label,
  children,
}: {
  id: string;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  label: string;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('rounded-xl border bg-white p-2 dark:bg-stone-950', selected ? 'border-brand-600' : 'border-stone-200 dark:border-stone-800')}>
      <div className="flex items-center gap-2">
        <button type="button" className="text-stone-400" {...listeners} {...attributes} aria-label="Drag">
          <GripVertical className="h-4 w-4" />
        </button>
        <button type="button" className="flex-1 truncate text-left text-sm" onClick={onSelect}>{label}</button>
        <button type="button" className="text-stone-400 hover:text-red-600" onClick={onRemove} aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function Inspector({
  selected,
  selectedPath,
  onChange,
  forms,
  services,
  mode,
}: {
  selected: FormioComponent | null;
  selectedPath: string | null;
  onChange: (patch: Partial<FormioComponent>) => void;
  forms: OrgForm[];
  services: Service[];
  mode: 'form' | 'homepage';
}) {
  if (!selected || !selectedPath) {
    return <aside className="rounded-2xl border border-stone-200 p-4 text-sm text-stone-500 dark:border-stone-800">Select a component to edit its settings.</aside>;
  }
  const optionsText = (selected.values ?? []).map((option) => option.label).join('\n');
  return (
    <aside className="max-h-[70vh] space-y-3 overflow-y-auto rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
      <p className="font-medium">{paletteLabel(selected.type)}</p>
      <div>
        <Label>Label</Label>
        <Input value={selected.label ?? selected.title ?? ''} onChange={(event) => onChange({ label: event.target.value, title: event.target.value })} />
      </div>
      <div>
        <Label>Key</Label>
        <Input value={selected.key ?? ''} onChange={(event) => onChange({ key: event.target.value })} />
      </div>
      {selected.input !== false && selected.type !== 'content' && selected.type !== 'htmlelement' ? (
        <>
          <div>
            <Label>Placeholder</Label>
            <Input value={selected.placeholder ?? ''} onChange={(event) => onChange({ placeholder: event.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={Boolean(selected.validate?.required)} onCheckedChange={(required) => onChange({ validate: { ...selected.validate, required } })} />
            Required
          </label>
        </>
      ) : null}
      {mode === 'homepage' ? (
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={selected.hidden !== true} onCheckedChange={(visible) => onChange({ hidden: !visible })} />
          Visible on dashboard
        </label>
      ) : null}
      {selected.type === 'content' || selected.type === 'htmlelement' || selected.type === 'custom' || selected.type === 'welcome' || selected.type === 'announcement' || selected.type === 'bookingCta' ? (
        <div>
          <Label>Text</Label>
          <Textarea value={selected.content ?? ''} onChange={(event) => onChange({ content: event.target.value })} />
        </div>
      ) : null}
      {['select', 'radio', 'selectboxes', 'survey'].includes(selected.type) ? (
        <div>
          <Label>Choices (one per line)</Label>
          <Textarea value={optionsText} onChange={(event) => onChange({ values: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => ({ label: line, value: line.toLowerCase().replace(/\s+/g, '_') })) })} />
        </div>
      ) : null}
      {selected.type === 'form' || selected.type === 'resource' ? (
        <div>
          <Label>Form</Label>
          <select className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-950" value={selected.form ?? ''} onChange={(event) => onChange({ form: event.target.value })}>
            <option value="">Choose a published form</option>
            {forms.filter((form) => form.status === 'published').map((form) => (
              <option key={form.id} value={form.id}>{form.name}</option>
            ))}
          </select>
        </div>
      ) : null}
      {selected.type === 'featuredServices' ? (
        <div className="space-y-2">
          <Label>Services</Label>
          {services.map((service) => {
            const selectedIds = selected.serviceIds ?? [];
            const checked = selectedIds.includes(service.id);
            return (
              <label key={service.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={checked} onChange={() => onChange({ serviceIds: checked ? selectedIds.filter((id) => id !== service.id) : [...selectedIds, service.id] })} />
                {service.name}
              </label>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}

