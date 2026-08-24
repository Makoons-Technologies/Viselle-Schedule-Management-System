import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, GripVertical, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FormioRenderer } from '@/components/forms/FormioRenderer';
import { GROUP_LABEL, allKeys, cloneComponent, isLayoutType, paletteFor, paletteLabel, type PaletteGroup, type PaletteItem } from '@/components/builder/palette';
import { componentAt, insertAt, moveTo, removeAt, resolveDropTarget, updateAt } from '@/components/builder/schemaTree';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { FormioComponent, FormioSchema, OrgForm, Service } from '@/types/api';

function smallestHits(args: Parameters<CollisionDetection>[0], hits: ReturnType<CollisionDetection>) {
  if (hits.length <= 1) return hits;
  return [...hits]
    .sort((left, right) => {
      const leftRect = args.droppableRects.get(left.id);
      const rightRect = args.droppableRects.get(right.id);
      const leftArea = (leftRect?.width ?? Infinity) * (leftRect?.height ?? Infinity);
      const rightArea = (rightRect?.width ?? Infinity) * (rightRect?.height ?? Infinity);
      return leftArea - rightArea;
    })
    .slice(0, 1);
}

const preferNestedCollision: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (!pointerHits.length) return [];
  const nestedZones = pointerHits.filter((hit) => {
    const id = String(hit.id);
    return id.startsWith('zone:') && id !== 'zone:root';
  });
  if (nestedZones.length) return smallestHits(args, nestedZones);
  const items = pointerHits.filter((hit) => String(hit.id).startsWith('item:'));
  if (items.length) return smallestHits(args, items);
  return smallestHits(args, pointerHits);
};

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
  const [paletteQuery, setPaletteQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<PaletteGroup>>(
    () => new Set(mode === 'homepage' ? ['homepage', 'layout'] : ['basic', 'layout']),
  );
  const [activeDrag, setActiveDrag] = useState<{ label: string } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const palette = paletteFor(mode);
  const selected = selectedPath ? componentAt(components, selectedPath) : null;
  const filteredPalette = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    if (!query) return palette;
    return palette.filter(
      (item) => item.label.toLowerCase().includes(query) || item.hint.toLowerCase().includes(query) || item.type.toLowerCase().includes(query),
    );
  }, [palette, paletteQuery]);
  const groups = (Object.keys(GROUP_LABEL) as PaletteGroup[]).filter((group) =>
    filteredPalette.some((item) => item.group === group),
  );

  const setComponents = (next: FormioComponent[]) => onChange({ ...schema, components: next });

  const onDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    if (activeId.startsWith('palette:')) {
      const [, group, type] = activeId.split(':');
      const item =
        palette.find((entry) => entry.group === group && entry.type === type) ??
        palette.find((entry) => entry.type === type);
      setActiveDrag({ label: item?.label ?? type });
      return;
    }
    if (activeId.startsWith('item:')) {
      const component = componentAt(components, activeId.replace('item:', ''));
      setActiveDrag({
        label: component
          ? `${paletteLabel(component.type)}${component.label ? ` · ${component.label}` : ''}`
          : 'Item',
      });
    }
  };

  const clearDrag = () => setActiveDrag(null);

  const onDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const target = resolveDropTarget(components, event.over ? String(event.over.id) : null, activeId);
    if (!target) {
      clearDrag();
      return;
    }
    if (activeId.startsWith('palette:')) {
      const [, group, type] = activeId.split(':');
      const item =
        palette.find((entry) => entry.group === group && entry.type === type) ??
        palette.find((entry) => entry.type === type);
      if (item) setComponents(insertAt(components, target, cloneComponent(item, allKeys(components))));
    } else if (activeId.startsWith('item:')) {
      setComponents(moveTo(components, activeId.replace('item:', ''), target));
    }
    clearDrag();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={preferNestedCollision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={clearDrag}
    >
      <div className="grid min-w-0 gap-4 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="max-h-[70vh] space-y-3 overflow-y-auto rounded-2xl border border-stone-200 p-3 dark:border-stone-800">
          <p className="text-sm font-medium">Drag onto the canvas</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              value={paletteQuery}
              onChange={(event) => setPaletteQuery(event.target.value)}
              placeholder="Search fields"
              className="h-9 pl-8"
            />
          </div>
          {groups.map((group) => {
            const open = paletteQuery.trim() ? true : openGroups.has(group);
            return (
              <div key={group}>
                <button
                  type="button"
                  className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-stone-500"
                  onClick={() =>
                    setOpenGroups((current) => {
                      const next = new Set(current);
                      if (next.has(group)) next.delete(group);
                      else next.add(group);
                      return next;
                    })
                  }
                >
                  {GROUP_LABEL[group]}
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
                </button>
                {open ? (
                  <div className="space-y-1">
                    {filteredPalette
                      .filter((item) => item.group === group)
                      .map((item) => (
                        <PaletteChip key={`${item.group}:${item.type}`} item={item} />
                      ))}
                  </div>
                ) : null}
              </div>
            );
          })}
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
          {mode === 'form' ? (
            <div className="rounded-2xl border border-dashed border-stone-300 p-4 dark:border-stone-700">
              <p className="mb-3 text-sm font-medium text-stone-500">Phone preview</p>
              <div className="mx-auto w-full max-w-sm rounded-3xl border border-stone-200 p-4 dark:border-stone-800">
                <FormioRenderer schema={schema} value={preview} onChange={setPreview} orgId={orgId} />
              </div>
            </div>
          ) : null}
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
      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <div className="cursor-grabbing rounded-lg border border-brand-600 bg-white px-3 py-2 text-sm shadow-lg dark:bg-stone-900">
            {activeDrag.label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function PaletteChip({ item }: { item: PaletteItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${item.group}:${item.type}`,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      className={cn(
        'w-full rounded-lg border border-stone-200 px-2 py-1.5 text-left text-sm hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900',
        isDragging && 'opacity-40',
      )}
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
  nested = false,
}: {
  id: string;
  components: FormioComponent[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onRemove: (path: string) => void;
  pathPrefix?: string;
  nested?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `zone:${id}` });
  const itemIds = components.map((_, index) => `item:${pathPrefix}${index}`);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-24 space-y-2 rounded-2xl border border-dashed p-3',
        isOver ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/30' : 'border-stone-300 dark:border-stone-700',
      )}
    >
      {components.length === 0 ? (
        <p className={cn('text-sm text-stone-500', nested && 'py-5 text-center')}>
          {nested ? 'Drop a card here' : 'Drop a component here.'}
        </p>
      ) : null}
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
      <div className="mt-2 grid grid-cols-2 gap-2">
        {component.columns.map((column, index) => (
          <div key={index} className="min-w-0">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-stone-500">
              {component.columns!.length === 2 ? (index === 0 ? 'Left' : 'Right') : `Column ${index + 1}`}
            </p>
            <CanvasList
              nested
              id={`${path}-col-${index}`}
              pathPrefix={`${path}.c${index}.`}
              components={column.components ?? []}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          </div>
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
            <CanvasList
              nested
              id={`${path}-tab-${index}`}
              pathPrefix={`${path}.${index}.`}
              components={tab.components ?? []}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          </div>
        ))}
      </div>
    );
  }
  if (component.rows) {
    return (
      <div className="mt-2 space-y-2">
        {component.rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-2 gap-2">
            {row.map((cell, cellIndex) => (
              <CanvasList
                nested
                key={cellIndex}
                id={`${path}-cell-${rowIndex}-${cellIndex}`}
                pathPrefix={`${path}.r${rowIndex}c${cellIndex}.`}
                components={cell.components ?? []}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-2">
      <CanvasList
        nested
        id={`${path}-kids`}
        pathPrefix={`${path}.`}
        components={component.components ?? []}
        selectedPath={selectedPath}
        onSelect={onSelect}
        onRemove={onRemove}
      />
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-xl border bg-white p-2 dark:bg-stone-950',
        selected ? 'border-brand-600' : 'border-stone-200 dark:border-stone-800',
        isDragging && 'opacity-40',
      )}
    >
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
      {mode !== 'homepage' && selected.input !== false && selected.type !== 'content' && selected.type !== 'htmlelement' ? (
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

