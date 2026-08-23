import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function columnsClass(count: number) {
  const n = Math.min(Math.max(count, 1), 4);
  return cn(
    'grid min-w-0 grid-cols-1 gap-4',
    n === 2 && 'sm:grid-cols-2',
    n === 3 && 'md:grid-cols-3',
    n >= 4 && 'sm:grid-cols-2 xl:grid-cols-4',
  );
}

export function ResponsiveTabs({
  tabs,
  children,
}: {
  tabs: Array<{ key?: string; label?: string }>;
  children: (index: number) => ReactNode;
}) {
  const [open, setOpen] = useState(0);
  return (
    <div className="min-w-0">
      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
        {tabs.map((tab, index) => (
          <button
            key={tab.key || index}
            type="button"
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm',
              open === index ? 'border-brand-600 bg-brand-50 font-medium dark:bg-brand-950/40' : 'border-stone-200 dark:border-stone-700',
            )}
            onClick={() => setOpen(index)}
          >
            {tab.label || `Tab ${index + 1}`}
          </button>
        ))}
      </div>
      <div className="mb-3 hidden border-b border-stone-200 md:flex dark:border-stone-800">
        {tabs.map((tab, index) => (
          <button
            key={tab.key || index}
            type="button"
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm',
              open === index ? 'border-brand-600 font-medium' : 'border-transparent text-stone-500',
            )}
            onClick={() => setOpen(index)}
          >
            {tab.label || `Tab ${index + 1}`}
          </button>
        ))}
      </div>
      <div className="min-w-0 space-y-4">{children(open)}</div>
    </div>
  );
}

export function ResponsiveTable({
  rows,
  renderCell,
}: {
  rows: unknown[][];
  renderCell: (rowIndex: number, cellIndex: number) => ReactNode;
}) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.flatMap((row, rowIndex) =>
          row.map((_, cellIndex) => (
            <div key={`${rowIndex}-${cellIndex}`} className="min-w-0 space-y-3 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
              {renderCell(rowIndex, cellIndex)}
            </div>
          )),
        )}
      </div>
      <div className="hidden max-w-full overflow-x-auto md:block">
        <table className="w-full min-w-[32rem] border-collapse">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((_, cellIndex) => (
                  <td key={cellIndex} className="align-top border border-stone-200 p-3 dark:border-stone-800">
                    <div className="min-w-0 space-y-3">{renderCell(rowIndex, cellIndex)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function CollapsibleBox({
  title,
  collapsible,
  children,
}: {
  title?: string;
  collapsible?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="min-w-0 space-y-3 rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
      {title ? (
        collapsible ? (
          <button type="button" className="w-full text-left font-medium" onClick={() => setOpen((value) => !value)}>
            {title}
          </button>
        ) : (
          <p className="font-medium">{title}</p>
        )
      ) : null}
      {open ? children : null}
    </div>
  );
}
