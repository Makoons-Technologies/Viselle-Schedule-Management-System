import { Crosshair, Copy, ScanSearch, X } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  collectInspectSnapshot,
  isDebugInspectorEnabled,
  isDebugInspectorUi,
  pickElementFromPoint,
  swallowNextClick,
  type DebugInspectorSnapshot,
} from '@/lib/debug-inspector';
import { cn } from '@/lib/utils';

type InspectorMode = 'idle' | 'pick' | 'panel';

function formatRect(rect: DebugInspectorSnapshot['rect']): string {
  return `${rect.width} × ${rect.height} at (${rect.left}, ${rect.top})`;
}

export function DebugInspectorRoot() {
  if (!isDebugInspectorEnabled()) return null;
  return <DebugInspector />;
}

function DebugInspector() {
  const [mode, setMode] = useState<InspectorMode>('idle');
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [snapshot, setSnapshot] = useState<DebugInspectorSnapshot | null>(null);
  const [copied, setCopied] = useState(false);

  const exitAll = useCallback(() => {
    setMode('idle');
    setHoverRect(null);
    setSnapshot(null);
    setCopied(false);
  }, []);

  const startPick = useCallback(() => {
    setMode('pick');
    setHoverRect(null);
    setSnapshot(null);
    setCopied(false);
  }, []);

  const selectElement = useCallback((element: Element) => {
    setSnapshot(collectInspectSnapshot(element));
    setHoverRect(element.getBoundingClientRect());
    setMode('panel');
  }, []);

  useEffect(() => {
    if (mode !== 'pick') return;

    const updateHover = (clientX: number, clientY: number) => {
      const el = pickElementFromPoint(clientX, clientY);
      setHoverRect(el ? el.getBoundingClientRect() : null);
    };

    let pointerStart: { x: number; y: number } | null = null;

    const onPointerMove = (event: PointerEvent) => {
      if (isDebugInspectorUi(event.target)) {
        setHoverRect(null);
        return;
      }
      updateHover(event.clientX, event.clientY);
    };

    const blockActivation = (event: Event) => {
      if (isDebugInspectorUi(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (isDebugInspectorUi(event.target)) return;
      pointerStart = { x: event.clientX, y: event.clientY };
      // Mouse only — preventDefault on touch would steal iPhone scroll.
      if (event.pointerType === 'mouse') blockActivation(event);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (isDebugInspectorUi(event.target)) return;
      const start = pointerStart;
      pointerStart = null;
      const moved = start
        ? Math.hypot(event.clientX - start.x, event.clientY - start.y)
        : 0;
      if (moved > 12) return;
      // Arm before React tears down pick listeners — the real `click` is next.
      swallowNextClick();
      blockActivation(event);
      const el = pickElementFromPoint(event.clientX, event.clientY);
      if (el) selectElement(el);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        exitAll();
      }
    };

    document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
    document.addEventListener('pointerdown', onPointerDown, { capture: true });
    document.addEventListener('pointerup', onPointerUp, { capture: true });
    document.addEventListener('click', blockActivation, { capture: true });
    document.addEventListener('keydown', onKeyDown);
    document.documentElement.classList.add('debug-inspector-picking');

    return () => {
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('click', blockActivation, true);
      document.removeEventListener('keydown', onKeyDown);
      document.documentElement.classList.remove('debug-inspector-picking');
    };
  }, [exitAll, mode, selectElement]);

  useEffect(() => {
    if (mode !== 'panel') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        exitAll();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [exitAll, mode]);

  useEffect(() => {
    if (mode === 'idle') return;
    const syncHighlight = () => {
      if (!snapshot) return;
      try {
        const match = document.querySelector(snapshot.selector);
        if (match) setHoverRect(match.getBoundingClientRect());
      } catch {
        // Selector may not uniquely resolve after a rerender.
      }
    };
    window.addEventListener('resize', syncHighlight);
    window.addEventListener('scroll', syncHighlight, true);
    window.visualViewport?.addEventListener('resize', syncHighlight);
    return () => {
      window.removeEventListener('resize', syncHighlight);
      window.removeEventListener('scroll', syncHighlight, true);
      window.visualViewport?.removeEventListener('resize', syncHighlight);
    };
  }, [mode, snapshot]);

  const copySelector = async () => {
    if (!snapshot?.selector) return;
    try {
      await navigator.clipboard.writeText(snapshot.selector);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div data-debug-inspector="root" className="contents">
      {hoverRect ? (
        <div
          data-testid="debug-inspector-highlight"
          aria-hidden
          className="pointer-events-none fixed z-[210] rounded-sm ring-2 ring-sky-400 ring-offset-1 ring-offset-sky-200/40"
          style={{
            top: hoverRect.top,
            left: hoverRect.left,
            width: Math.max(hoverRect.width, 1),
            height: Math.max(hoverRect.height, 1),
          }}
        />
      ) : null}

      {mode === 'panel' ? (
        <button
          type="button"
          aria-label="Close inspector overlay"
          className="fixed inset-0 z-[211] bg-stone-950/40"
          onClick={exitAll}
        />
      ) : null}

      {mode !== 'panel' ? (
      <button
        type="button"
        data-testid="debug-inspector-fab"
        aria-pressed={mode === 'pick'}
        aria-label={mode === 'pick' ? 'Cancel inspect' : 'Inspect'}
        onClick={() => (mode === 'pick' ? exitAll() : startPick())}
        className={cn(
          'debug-inspector-fab fixed z-[220] flex min-h-12 touch-manipulation items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold shadow-lg',
          'right-3',
          'bottom-[calc(3.25rem+var(--app-shell-bottomnav-pad,1.5rem)+0.75rem)]',
          'desktop-shell:bottom-5',
          mode === 'pick'
            ? 'bg-sky-600 text-white hover:bg-sky-700'
            : 'bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white',
        )}
      >
        {mode === 'pick' ? <X className="h-4 w-4" /> : <ScanSearch className="h-4 w-4" />}
        {mode === 'pick' ? 'Cancel' : 'Inspect'}
      </button>
      ) : null}

      {mode === 'panel' && snapshot ? (
        <section
          data-testid="debug-inspector-panel"
          role="dialog"
          aria-label="Element inspector"
          className="debug-inspector-panel fixed inset-x-0 bottom-0 z-[221] flex max-h-[min(70dvh,32rem)] flex-col rounded-t-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-950 desktop-shell:inset-x-auto desktop-shell:bottom-5 desktop-shell:right-4 desktop-shell:max-h-[min(80vh,40rem)] desktop-shell:w-[26rem] desktop-shell:rounded-2xl"
        >
          <header className="flex shrink-0 items-start gap-3 border-b border-stone-200 px-4 pb-3 pt-3 dark:border-stone-800">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                Staging inspector
              </p>
              <h2 className="truncate font-mono text-sm text-stone-900 dark:text-stone-100">
                {snapshot.tagName}
                {snapshot.id ? `#${snapshot.id}` : ''}
                {snapshot.classList.length ? `.${snapshot.classList.slice(0, 3).join('.')}` : ''}
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">{formatRect(snapshot.rect)}</p>
            </div>
            <button
              type="button"
              data-testid="debug-inspector-close"
              aria-label="Close inspector"
              onClick={exitAll}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-800 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
            >
              <X className="h-6 w-6" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-4">
            <InspectorSection title="Breadcrumbs">
              <p className="break-all font-mono text-[11px] leading-5 text-stone-700 dark:text-stone-300">
                {snapshot.breadcrumbs.join(' › ')}
              </p>
            </InspectorSection>

            <InspectorSection title="Selector">
              <p className="break-all font-mono text-[11px] leading-5 text-stone-700 dark:text-stone-300">
                {snapshot.selector}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="debug-inspector-copy"
                  onClick={copySelector}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-stone-900 px-3 text-sm font-medium text-white dark:bg-stone-100 dark:text-stone-900"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copied' : 'Copy selector'}
                </button>
                <button
                  type="button"
                  data-testid="debug-inspector-pick"
                  onClick={startPick}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-800 dark:border-stone-600 dark:text-stone-100"
                >
                  <Crosshair className="h-4 w-4" />
                  Pick another
                </button>
              </div>
            </InspectorSection>

            <InspectorSection title="Classes">
              <p className="break-all font-mono text-[11px] text-stone-700 dark:text-stone-300">
                {snapshot.classList.length ? snapshot.classList.join(' ') : '—'}
              </p>
            </InspectorSection>

            <InspectorSection title="Attributes">
              {snapshot.attributes.length === 0 ? (
                <p className="text-xs text-stone-500">None of role / aria-* / data-* / href / type / name</p>
              ) : (
                <dl className="space-y-1.5">
                  {snapshot.attributes.map((attr) => (
                    <div key={attr.name}>
                      <dt className="font-mono text-[10px] uppercase tracking-wide text-stone-500">{attr.name}</dt>
                      <dd className="break-all font-mono text-[11px] text-stone-800 dark:text-stone-200">{attr.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </InspectorSection>

            <InspectorSection title="Text">
              <p className="whitespace-pre-wrap break-words text-xs text-stone-700 dark:text-stone-300">
                {snapshot.text || '—'}
              </p>
            </InspectorSection>

            <InspectorSection title="Computed CSS">
              <dl className="space-y-1">
                {Object.entries(snapshot.css).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[7.5rem_1fr] gap-2">
                    <dt className="font-mono text-[10px] text-stone-500">{key}</dt>
                    <dd className="break-all font-mono text-[11px] text-stone-800 dark:text-stone-200">
                      {value || '—'}
                    </dd>
                  </div>
                ))}
              </dl>
            </InspectorSection>
          </div>
        </section>
      ) : null}
    </div>,
    document.body,
  );
}

function InspectorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">{title}</h3>
      {children}
    </section>
  );
}
