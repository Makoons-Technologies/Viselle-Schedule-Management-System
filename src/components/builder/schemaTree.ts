import { isLayoutType } from '@/components/builder/palette';
import type { FormioComponent, FormioSchema, HomepageBlock } from '@/types/api';

export type DropTarget =
  | { kind: 'root'; index: number }
  | { kind: 'components'; parentPath: string; index: number }
  | { kind: 'column'; parentPath: string; columnIndex: number; index: number }
  | { kind: 'cell'; parentPath: string; rowIndex: number; cellIndex: number; index: number };

type Segment =
  | { kind: 'index'; index: number }
  | { kind: 'column'; index: number }
  | { kind: 'cell'; row: number; cell: number };

function parseSegments(path: string): Segment[] {
  return path.split('.').filter(Boolean).map((part) => {
    if (/^c\d+$/.test(part)) return { kind: 'column', index: Number(part.slice(1)) };
    const cell = part.match(/^r(\d+)c(\d+)$/);
    if (cell) return { kind: 'cell', row: Number(cell[1]), cell: Number(cell[2]) };
    return { kind: 'index', index: Number(part) };
  });
}

function serialize(segments: Segment[]): string {
  return segments
    .map((segment) => {
      if (segment.kind === 'column') return `c${segment.index}`;
      if (segment.kind === 'cell') return `r${segment.row}c${segment.cell}`;
      return String(segment.index);
    })
    .join('.');
}

function walkItem(components: FormioComponent[], path: string): { node: FormioComponent; list: FormioComponent[]; index: number } | null {
  if (!path) return null;
  const segments = parseSegments(path);
  let list = components;
  let node: FormioComponent | null = null;
  let index = -1;
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const next = segments[i + 1];
    if (segment.kind === 'column') {
      if (!node?.columns?.[segment.index]) return null;
      list = node.columns[segment.index].components ?? [];
      node = null;
      index = -1;
      continue;
    }
    if (segment.kind === 'cell') {
      if (!node?.rows?.[segment.row]?.[segment.cell]) return null;
      list = node.rows[segment.row][segment.cell].components ?? [];
      node = null;
      index = -1;
      continue;
    }
    index = segment.index;
    node = list[index] ?? null;
    if (!node) return null;
    if (next?.kind === 'index') list = node.components ?? [];
  }
  return node ? { node, list, index } : null;
}

export function componentAt(components: FormioComponent[], path: string): FormioComponent | null {
  return walkItem(components, path)?.node ?? null;
}

export function parentPath(path: string) {
  const segments = parseSegments(path);
  segments.pop();
  return serialize(segments);
}

export function updateAt(components: FormioComponent[], path: string, patch: Partial<FormioComponent>): FormioComponent[] {
  const clone = structuredClone(components);
  const found = walkItem(clone, path);
  if (!found) return components;
  found.list[found.index] = { ...found.node, ...patch };
  return clone;
}

export function removeAt(components: FormioComponent[], path: string): FormioComponent[] {
  const clone = structuredClone(components);
  const found = walkItem(clone, path);
  if (!found) return components;
  found.list.splice(found.index, 1);
  return clone;
}

export function moveInList(list: FormioComponent[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (!item) return list;
  next.splice(to, 0, item);
  return next;
}

function writeList(components: FormioComponent[], containerPath: string, next: FormioComponent[]): FormioComponent[] {
  if (!containerPath) return next;
  const segments = parseSegments(containerPath);
  const last = segments[segments.length - 1];
  if (last.kind === 'column') {
    const layoutPath = serialize(segments.slice(0, -1));
    const parent = componentAt(components, layoutPath);
    if (!parent?.columns) return components;
    const columns = parent.columns.map((column, index) =>
      index === last.index ? { ...column, components: next } : column,
    );
    return updateAt(components, layoutPath, { columns });
  }
  if (last.kind === 'cell') {
    const layoutPath = serialize(segments.slice(0, -1));
    const parent = componentAt(components, layoutPath);
    if (!parent?.rows) return components;
    const rows = parent.rows.map((row, rowIndex) =>
      row.map((cell, cellIndex) =>
        rowIndex === last.row && cellIndex === last.cell ? { ...cell, components: next } : cell,
      ),
    );
    return updateAt(components, layoutPath, { rows });
  }
  const parent = componentAt(components, containerPath);
  if (!parent) return components;
  return updateAt(components, containerPath, { components: next });
}

function readList(components: FormioComponent[], containerPath: string): FormioComponent[] | null {
  if (!containerPath) return components;
  const segments = parseSegments(containerPath);
  const last = segments[segments.length - 1];
  if (last.kind === 'column') {
    const parent = componentAt(components, serialize(segments.slice(0, -1)));
    return parent?.columns?.[last.index]?.components ?? null;
  }
  if (last.kind === 'cell') {
    const parent = componentAt(components, serialize(segments.slice(0, -1)));
    return parent?.rows?.[last.row]?.[last.cell]?.components ?? null;
  }
  return componentAt(components, containerPath)?.components ?? null;
}

export function insertAt(components: FormioComponent[], target: DropTarget, item: FormioComponent): FormioComponent[] {
  if (target.kind === 'root') {
    const next = [...components];
    next.splice(Math.min(target.index, next.length), 0, item);
    return next;
  }
  if (target.kind === 'components') {
    const list = [...(readList(components, target.parentPath) ?? [])];
    list.splice(Math.min(target.index, list.length), 0, item);
    return writeList(components, target.parentPath, list);
  }
  if (target.kind === 'column') {
    const list = [...(readList(components, `${target.parentPath}.c${target.columnIndex}`) ?? [])];
    list.splice(Math.min(target.index, list.length), 0, item);
    return writeList(components, `${target.parentPath}.c${target.columnIndex}`, list);
  }
  const list = [...(readList(components, `${target.parentPath}.r${target.rowIndex}c${target.cellIndex}`) ?? [])];
  list.splice(Math.min(target.index, list.length), 0, item);
  return writeList(components, `${target.parentPath}.r${target.rowIndex}c${target.cellIndex}`, list);
}

export function reorder(components: FormioComponent[], path: string, from: number, to: number): FormioComponent[] {
  const list = readList(components, path);
  if (!list) return components;
  return writeList(components, path, moveInList(list, from, to));
}

function lastIndex(path: string): number | null {
  const segments = parseSegments(path);
  const last = segments[segments.length - 1];
  return last?.kind === 'index' ? last.index : null;
}

function targetParentPath(target: DropTarget): string {
  if (target.kind === 'root') return '';
  if (target.kind === 'components') return target.parentPath;
  if (target.kind === 'column') return `${target.parentPath}.c${target.columnIndex}`;
  return `${target.parentPath}.r${target.rowIndex}c${target.cellIndex}`;
}

function segmentsEqual(left: Segment[], right: Segment[]) {
  if (left.length !== right.length) return false;
  return left.every((segment, index) => JSON.stringify(segment) === JSON.stringify(right[index]));
}

function shiftPathAfterRemove(path: string, fromPath: string): string {
  const fromSegs = parseSegments(fromPath);
  const pathSegs = parseSegments(path);
  const fromLast = fromSegs[fromSegs.length - 1];
  if (fromLast?.kind !== 'index' || pathSegs.length <= fromSegs.length - 1) return path;
  const fromParent = fromSegs.slice(0, -1);
  if (!segmentsEqual(pathSegs.slice(0, fromParent.length), fromParent)) return path;
  const next = pathSegs[fromParent.length];
  if (next?.kind === 'index' && next.index > fromLast.index) next.index -= 1;
  return serialize(pathSegs);
}

function adjustTargetAfterRemoval(target: DropTarget, fromPath: string): DropTarget {
  const fromIndex = lastIndex(fromPath);
  const fromParent = parentPath(fromPath);
  if (target.kind === 'root') {
    if (fromParent === '' && fromIndex !== null && target.index > fromIndex) {
      return { ...target, index: target.index - 1 };
    }
    return target;
  }
  const shiftedParent = shiftPathAfterRemove(target.parentPath, fromPath);
  const sameList = fromParent === targetParentPath({ ...target, parentPath: target.parentPath });
  const nextIndex =
    sameList && fromIndex !== null && target.index > fromIndex ? target.index - 1 : target.index;
  if (target.kind === 'components') return { ...target, parentPath: shiftedParent, index: nextIndex };
  if (target.kind === 'column') {
    return { ...target, parentPath: shiftedParent, index: sameList ? nextIndex : target.index };
  }
  return { ...target, parentPath: shiftedParent, index: sameList ? nextIndex : target.index };
}

function isTargetInsidePath(target: DropTarget, fromPath: string) {
  if (!fromPath) return false;
  const dest = targetParentPath(target);
  return dest === fromPath || dest.startsWith(`${fromPath}.`);
}

export function moveTo(components: FormioComponent[], fromPath: string, target: DropTarget): FormioComponent[] {
  const found = walkItem(components, fromPath);
  if (!found || isTargetInsidePath(target, fromPath)) return components;
  const item = structuredClone(found.node);
  const without = removeAt(components, fromPath);
  return insertAt(without, adjustTargetAfterRemoval(target, fromPath), item);
}

export function retargetIntoLayout(components: FormioComponent[], target: DropTarget): DropTarget {
  const path = layoutPathForTarget(target);
  if (!path) return target;
  const component = componentAt(components, path);
  if (!component || !isLayoutType(component.type)) return target;
  if (component.columns?.length) {
    return { kind: 'column', parentPath: path, columnIndex: 0, index: 999 };
  }
  if (component.rows?.length) {
    return { kind: 'cell', parentPath: path, rowIndex: 0, cellIndex: 0, index: 999 };
  }
  if (component.type === 'tabs' && component.components?.length) {
    return { kind: 'components', parentPath: `${path}.0`, index: 999 };
  }
  return { kind: 'components', parentPath: path, index: 999 };
}

export function resolveDropTarget(
  components: FormioComponent[],
  overId: string | null | undefined,
  activeId: string,
): DropTarget | null {
  if (!overId || overId === activeId) return null;
  const raw = parseDrop(overId);
  if (!raw) return null;
  return retargetIntoLayout(components, raw);
}

export function layoutPathForTarget(target: DropTarget): string | null {
  if (target.index >= 999) return null;
  if (target.kind === 'root') return String(target.index);
  if (target.kind === 'components') {
    return target.parentPath ? `${target.parentPath}.${target.index}` : String(target.index);
  }
  if (target.kind === 'column') {
    return `${target.parentPath}.c${target.columnIndex}.${target.index}`;
  }
  return `${target.parentPath}.r${target.rowIndex}c${target.cellIndex}.${target.index}`;
}

export function parseDrop(overId: string): DropTarget | null {
  if (overId === 'zone:root' || overId === 'zone:') return { kind: 'root', index: 999 };
  if (overId.startsWith('item:')) {
    const path = overId.replace('item:', '');
    const segments = parseSegments(path);
    const last = segments[segments.length - 1];
    if (last.kind !== 'index') return null;
    const parentSegments = segments.slice(0, -1);
    if (parentSegments.length === 0) return { kind: 'root', index: last.index };
    const parentLast = parentSegments[parentSegments.length - 1];
    if (parentLast.kind === 'column') {
      return {
        kind: 'column',
        parentPath: serialize(parentSegments.slice(0, -1)),
        columnIndex: parentLast.index,
        index: last.index,
      };
    }
    if (parentLast.kind === 'cell') {
      return {
        kind: 'cell',
        parentPath: serialize(parentSegments.slice(0, -1)),
        rowIndex: parentLast.row,
        cellIndex: parentLast.cell,
        index: last.index,
      };
    }
    return { kind: 'components', parentPath: serialize(parentSegments), index: last.index };
  }
  if (overId.startsWith('zone:')) {
    const id = overId.replace('zone:', '');
    if (id === 'root') return { kind: 'root', index: 999 };
    const col = id.match(/^(.*)-col-(\d+)$/);
    if (col) return { kind: 'column', parentPath: col[1], columnIndex: Number(col[2]), index: 999 };
    const cell = id.match(/^(.*)-cell-(\d+)-(\d+)$/);
    if (cell) return { kind: 'cell', parentPath: cell[1], rowIndex: Number(cell[2]), cellIndex: Number(cell[3]), index: 999 };
    const tab = id.match(/^(.*)-tab-(\d+)$/);
    if (tab) return { kind: 'components', parentPath: `${tab[1]}.${tab[2]}`, index: 999 };
    return { kind: 'components', parentPath: id.replace(/-kids$/, ''), index: 999 };
  }
  return null;
}

export function emptySchema(): FormioSchema {
  return { display: 'form', components: [] };
}

export function blocksToSchema(blocks: HomepageBlock[]): FormioSchema {
  return { display: 'form', components: blocks.map(blockToComponent) };
}

export function schemaToBlocks(schema: FormioSchema): HomepageBlock[] {
  return (schema.components ?? []).map(componentToBlock);
}

export function blockToComponent(block: HomepageBlock): FormioComponent {
  return {
    type: block.type,
    key: block.id,
    label: block.title ?? block.label,
    content: block.body ?? block.content,
    hidden: block.visible === false,
    placeholder: block.placeholder,
    input: block.input,
    validate: block.validate,
    values: block.values,
    serviceIds: block.serviceIds,
    form: block.formId,
    components:
      block.components?.map(blockToComponent) ??
      block.tabs?.map((tab) => ({
        type: 'tab',
        key: tab.key,
        label: tab.label,
        input: false,
        components: tab.components.map(blockToComponent),
      })),
    columns: block.columns?.map((column) => ({
      width: column.width,
      components: column.components.map(blockToComponent),
    })),
    rows: block.rows?.map((row) => row.map((cell) => ({ components: cell.components.map(blockToComponent) }))),
  };
}

export function componentToBlock(component: FormioComponent): HomepageBlock {
  const tabs =
    component.type === 'tabs'
      ? (component.components ?? []).map((tab) => ({
          label: tab.label || 'Tab',
          key: tab.key,
          components: (tab.components ?? []).map(componentToBlock),
        }))
      : undefined;
  return {
    id: component.key || crypto.randomUUID(),
    type: component.type,
    visible: component.hidden !== true,
    title: component.label,
    body: component.content,
    serviceIds: component.serviceIds,
    formId: component.form || component.formId,
    label: component.label,
    content: component.content,
    placeholder: component.placeholder,
    input: component.input,
    validate: component.validate,
    values: component.values,
    components: component.type === 'tabs' ? undefined : component.components?.map(componentToBlock),
    tabs,
    columns: component.columns?.map((column) => ({
      width: column.width,
      components: (column.components ?? []).map(componentToBlock),
    })),
    rows: component.rows?.map((row) => row.map((cell) => ({ components: (cell.components ?? []).map(componentToBlock) }))),
  };
}
