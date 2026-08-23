import { useQuery } from '@tanstack/react-query';
import { Percent } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Panel, sectionMutedClass } from '@/components/common/Panel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrgId } from '@/hooks/useOrgId';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import type { CommissionRow } from '@/types/api';

function currentMonthRange(now = new Date()): { from: string; to: string } {
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  };
}

export function CommissionsPage() {
  const orgId = useOrgId();
  const defaults = useMemo(() => currentMonthRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const rangeValid = Boolean(from && to && from <= to);

  const reportQuery = useQuery({
    queryKey: ['commissions', orgId, from, to],
    queryFn: () => orgApi.getCommissions(orgId, { from, to }),
    enabled: !!orgId && rangeValid,
  });

  const rows = reportQuery.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <p className={cn('-mt-2', sectionMutedClass)}>
        Who earned what this period. Commission is percent of service sales plus 100% of tips. Set each
        person&apos;s percent on Staff.
      </p>

      <Panel className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="commission-from">From</Label>
            <Input
              id="commission-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="commission-to">To</Label>
            <Input
              id="commission-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>
        {!rangeValid && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">Choose a from date on or before the to date.</p>
        )}
      </Panel>

      {!rangeValid ? null : reportQuery.isLoading ? (
        <LoadingState message="Adding up this period…" />
      ) : reportQuery.isError ? (
        <Panel className="p-4 text-sm text-red-700 dark:text-red-300" role="alert">
          {getApiErrorMessage(reportQuery.error, 'Could not load commissions. Try another date range.')}
        </Panel>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="Nothing to split yet"
          description="Paid visits in this range will show here. Tips go 100% to the person who took the sale."
        />
      ) : (
        <Panel className="overflow-hidden">
          <div className="desktop-shell:hidden">
            {rows.map((row) => (
              <CommissionCard key={row.accountId} row={row} />
            ))}
          </div>
          <div className="hidden desktop-shell:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Tips</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.accountId}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{formatCurrency(row.salesCents)}</TableCell>
                    <TableCell>{formatCurrency(row.tipCents)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(row.commissionCents)}</TableCell>
                    <TableCell>{row.saleCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      )}
    </div>
  );
}

function CommissionCard({ row }: { row: CommissionRow }) {
  return (
    <div className="space-y-2 border-b border-stone-100 p-4 last:border-b-0 dark:border-stone-800">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{row.name}</p>
        <p className="font-medium">{formatCurrency(row.commissionCents)}</p>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-stone-500">Sales</dt>
          <dd>{formatCurrency(row.salesCents)}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Tips</dt>
          <dd>{formatCurrency(row.tipCents)}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Visits</dt>
          <dd>{row.saleCount}</dd>
        </div>
      </dl>
    </div>
  );
}
