/** Staging-only DOM inspector. Fail closed on production Viselle hosts. */

export const DEBUG_INSPECTOR_ROOT_ATTR = 'data-debug-inspector';
export const DEBUG_INSPECTOR_SESSION_KEY = 'viselle.debug-inspector';

const STAGING_HOST = 'staging.viselle.net';
const PRODUCTION_APEX = 'viselle.net';

const RELEVANT_ATTR_EXACT = new Set([
  'role',
  'href',
  'type',
  'name',
  'src',
  'alt',
  'for',
  'value',
  'placeholder',
  'title',
  'tabindex',
  'disabled',
  'checked',
  'aria-label',
]);

const COMPUTED_STYLE_KEYS = [
  'display',
  'position',
  'z-index',
  'overflow',
  'overflow-x',
  'overflow-y',
  'opacity',
  'transform',
  'background-color',
  'background-image',
  'color',
  'font-size',
  'pointer-events',
  'visibility',
] as const;

export type DebugInspectorComputedStyle = Record<(typeof COMPUTED_STYLE_KEYS)[number], string>;

export interface DebugInspectorSnapshot {
  tagName: string;
  id: string;
  classList: string[];
  rect: { x: number; y: number; width: number; height: number; top: number; left: number };
  attributes: Array<{ name: string; value: string }>;
  breadcrumbs: string[];
  text: string;
  css: DebugInspectorComputedStyle;
  selector: string;
}

export function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

/** Production marketing, API-adjacent, and paid booking subdomains (*.viselle.net). */
export function isProductionViselleHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (!host) return false;
  if (isStagingViselleHost(host)) return false;
  return host === PRODUCTION_APEX || host === `www.${PRODUCTION_APEX}` || host.endsWith(`.${PRODUCTION_APEX}`);
}

export function isStagingViselleHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  return host === STAGING_HOST || host.endsWith(`.${STAGING_HOST}`);
}

export function isDebugInspectorEnvEnabled(flag: unknown): boolean {
  return String(flag ?? '')
    .trim()
    .toLowerCase() === 'true';
}

export function isDebugInspectorSessionEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(DEBUG_INSPECTOR_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function readViteInspectorFlag(): unknown {
  try {
    return import.meta.env?.VITE_DEBUG_INSPECTOR;
  } catch {
    return undefined;
  }
}

/**
 * Enable only on staging.viselle.net, or when VITE_DEBUG_INSPECTOR=true
 * (or a sessionStorage override) on a non-production host.
 * Production viselle.net / www / shop subdomains never enable.
 */
export function isDebugInspectorEnabled(options?: { hostname?: string; envFlag?: unknown }): boolean {
  const hostname = normalizeHostname(
    options?.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : ''),
  );
  if (!hostname) return false;
  if (isProductionViselleHost(hostname)) return false;
  if (isStagingViselleHost(hostname)) return true;

  const envFlag = options?.envFlag !== undefined ? options.envFlag : readViteInspectorFlag();
  if (isDebugInspectorEnvEnabled(envFlag)) return true;
  return isDebugInspectorSessionEnabled();
}

export function isDebugInspectorUi(node: EventTarget | null): boolean {
  return node instanceof Element && Boolean(node.closest(`[${DEBUG_INSPECTOR_ROOT_ATTR}]`));
}

/** Keep the leftover `click` after pointerup from following links/buttons. */
export function swallowNextClick(timeoutMs = 500): void {
  if (typeof document === 'undefined') return;
  const guard = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
    document.removeEventListener('click', guard, true);
  };
  document.addEventListener('click', guard, true);
  window.setTimeout(() => document.removeEventListener('click', guard, true), timeoutMs);
}

export function pickElementFromPoint(clientX: number, clientY: number): Element | null {
  if (typeof document === 'undefined') return null;
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const node of stack) {
    if (node instanceof Element && !isDebugInspectorUi(node)) return node;
  }
  return null;
}

export function truncateInspectorText(value: string, max = 240): string {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, max - 1)}…`;
}

export function formatElementLabel(tagName: string, id: string, classNames: string[]): string {
  const tag = tagName.toLowerCase();
  const idPart = id ? `#${id}` : '';
  const classPart = classNames.length ? `.${classNames.join('.')}` : '';
  return `${tag}${idPart}${classPart}`;
}

export function selectRelevantAttributes(
  attributes: Array<{ name: string; value: string }>,
): Array<{ name: string; value: string }> {
  return attributes
    .filter(({ name }) => {
      const key = name.toLowerCase();
      if (key === DEBUG_INSPECTOR_ROOT_ATTR) return false;
      if (RELEVANT_ATTR_EXACT.has(key)) return true;
      if (key.startsWith('aria-') || key.startsWith('data-')) return true;
      return false;
    })
    .map(({ name, value }) => ({ name, value: truncateInspectorText(value, 160) }));
}

function cssEscapeIdent(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/([^\w-])/g, '\\$1');
}

export function buildCssPath(element: Element, maxDepth = 8): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && parts.length < maxDepth) {
    const tag = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`${tag}#${cssEscapeIdent(current.id)}`);
      break;
    }

    const classes = [...current.classList]
      .filter((cls) => cls && !cls.startsWith('_') && cls.length < 48)
      .slice(0, 2)
      .map(cssEscapeIdent);
    let part = classes.length ? `${tag}.${classes.join('.')}` : tag;

    const parent: Element | null = current.parentElement;
    if (parent) {
      const sameTag = [...parent.children].filter((child) => child.tagName === current!.tagName);
      if (sameTag.length > 1) {
        part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
      }
    }

    parts.unshift(part);
    if (tag === 'html' || tag === 'body') break;
    current = parent;
  }

  return parts.join(' > ');
}

export function buildBreadcrumbs(element: Element, maxDepth = 12): string[] {
  const crumbs: string[] = [];
  let current: Element | null = element;
  while (current && crumbs.length < maxDepth) {
    crumbs.unshift(formatElementLabel(current.tagName, current.id, [...current.classList].slice(0, 3)));
    if (current.tagName.toLowerCase() === 'body') break;
    current = current.parentElement;
  }
  return crumbs;
}

function readComputedStyles(element: Element): DebugInspectorComputedStyle {
  const style = getComputedStyle(element);
  const css = {} as DebugInspectorComputedStyle;
  for (const key of COMPUTED_STYLE_KEYS) {
    css[key] = style.getPropertyValue(key) || '';
  }
  return css;
}

export function collectInspectSnapshot(element: Element): DebugInspectorSnapshot {
  const rect = element.getBoundingClientRect();
  const attributes = selectRelevantAttributes(
    [...element.attributes].map((attr) => ({ name: attr.name, value: attr.value })),
  );

  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id,
    classList: [...element.classList],
    rect: {
      x: roundPx(rect.x),
      y: roundPx(rect.y),
      width: roundPx(rect.width),
      height: roundPx(rect.height),
      top: roundPx(rect.top),
      left: roundPx(rect.left),
    },
    attributes,
    breadcrumbs: buildBreadcrumbs(element),
    text: truncateInspectorText(element.textContent ?? ''),
    css: readComputedStyles(element),
    selector: buildCssPath(element),
  };
}

function roundPx(value: number): number {
  return Math.round(value * 10) / 10;
}
