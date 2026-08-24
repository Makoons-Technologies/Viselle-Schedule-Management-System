import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Percent } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Panel, sectionMutedClass } from '@/components/common/Panel';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import type { CommissionRow, StaffPayoutPreviewRow } from '@/types/api';

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
  const queryClient = useQueryClient();
  const trialExpired = useOrgWriteLocked();
  const defaults = useMemo(() => currentMonthRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const rangeValid = Boolean(from && to && from <= to);

  const settingsQuery = useQuery({
    queryKey: ['staff-payouts', orgId],
    queryFn: () => orgApi.getStaffPayoutSettings(orgId),
    enabled: !!orgId,
  });

  const reportQuery = useQuery({
    queryKey: ['commissions', orgId, from, to],
    queryFn: () => orgApi.getCommissions(orgId, { from, to }),
    enabled: !!orgId && rangeValid,
  });

  const previewQuery = useQuery({
    queryKey: ['staff-payouts-preview', orgId, from, to],
    queryFn: () => orgApi.previewStaffPayouts(orgId, { from, to }),
    enabled: !!orgId && rangeValid && settingsQuery.data?.mode === 'salon_stripe',
  });

  const sendMutation = useMutation({
    mutationFn: () => orgApi.sendStaffPayouts(orgId, { from, to }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['staff-payouts-preview', orgId] });
      queryClient.invalidateQueries({ queryKey: ['staff-payouts', orgId] });
      const sent = result.rows.filter((row) => row.status === 'succeeded' && !row.alreadyPaid).length;
      const skipped = result.rows.filter((row) => row.status === 'skipped' || row.skipReason === 'not_ready').length;
      const failed = result.rows.filter((row) => row.status === 'failed').length;
      if (failed > 0) toast.error(`${failed} transfer${failed === 1 ? '' : 's'} failed. Check the list below.`);
      else if (sent === 0 && skipped > 0) toast.message('Nothing sent. Some staff still need to add a bank.');
      else toast.success(sent > 0 ? `Sent ${sent} payout${sent === 1 ? '' : 's'}.` : 'No new payouts to send.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rows = reportQuery.data?.rows ?? [];
  const optedIn = settingsQuery.data?.mode === 'salon_stripe';
  const previewRows = previewQuery.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <p className={cn('-mt-2', sectionMutedClass)}>
        {optedIn
          ? 'Who earned what this period. Sending a payout transfers the worksheet amount from the salon Stripe balance — not W-2 or 1099 payroll. Set each person\u2019s percent on Staff.'
          : 'Who earned what this period. You pay staff outside Viselle. Commission is percent of service sales plus 100% of tips. Set each person\u2019s percent on Staff.'}
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

      {optedIn ? (
        <Panel className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">Send this period</h3>
              <p className={cn('mt-1 text-sm', sectionMutedClass)}>
                Auto-send uses the schedule on Payments. Anyone who has not finished adding a bank is skipped.
              </p>
              {settingsQuery.data?.lastAutoRunAt ? (
                <p className={cn('mt-1 text-xs', sectionMutedClass)}>
                  Last automatic run {new Date(settingsQuery.data.lastAutoRunAt).toLocaleString()}
                  {settingsQuery.data.lastAutoPeriodFrom && settingsQuery.data.lastAutoPeriodTo
                    ? ` for ${settingsQuery.data.lastAutoPeriodFrom} to ${settingsQuery.data.lastAutoPeriodTo}`
                    : ''}
                  .
                </p>
              ) : null}
            </div>
            <TrialLockedControl locked={trialExpired}>
              <Button
                type="button"
                disabled={trialExpired || !rangeValid || sendMutation.isPending}
                onClick={() => sendMutation.mutate()}
              >
                {sendMutation.isPending ? 'Sending…' : 'Send this period'}
              </Button>
            </TrialLockedControl>
          </div>
          {previewQuery.isLoading ? (
            <p className={cn('text-sm', sectionMutedClass)}>Checking who is ready…</p>
          ) : previewRows.length > 0 ? (
            <ul className="space-y-2">
              {previewRows.map((row) => (
                <PayoutReadinessRow
                  key={row.accountId}
                  row={mergeLedgerStatus(row, previewQuery.data?.recentPayouts)}
                />
              ))}
            </ul>
          ) : null}
        </Panel>
      ) : null}

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

function mergeLedgerStatus(
  row: StaffPayoutPreviewRow,
  recent?: Array<{ staffAccountId: string; status: StaffPayoutPreviewRow['status']; error?: string | null }>,
): StaffPayoutPreviewRow {
  const latest = recent?.find((item) => item.staffAccountId === row.accountId);
  if (!latest) return row;
  return { ...row, status: latest.status ?? row.status, error: latest.error ?? row.error };
}

function payoutStatusLabel(row: StaffPayoutPreviewRow): { label: string; variant: 'success' | 'secondary' } {
  if (row.status === 'succeeded' || row.alreadyPaid) return { label: 'Paid', variant: 'success' };
  if (row.status === 'failed') return { label: 'Failed', variant: 'secondary' };
  if (row.skipReason === 'not_ready' || row.status === 'skipped') return { label: 'Needs bank', variant: 'secondary' };
  if (row.skipReason === 'zero' || row.status === 'zero') return { label: 'Nothing to send', variant: 'secondary' };
  if (row.payoutsReady) return { label: 'Ready', variant: 'success' };
  return { label: 'Needs bank', variant: 'secondary' };
}

function PayoutReadinessRow({ row }: { row: StaffPayoutPreviewRow }) {
  const status = payoutStatusLabel(row);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div>
        <p className="font-medium">{row.name}</p>
        <p className={cn('text-xs', sectionMutedClass)}>
          {formatCurrency(row.totalCents)}
          {row.error ? ` — ${row.error}` : ''}
        </p>
      </div>
      <Badge variant={status.variant}>{status.label}</Badge>
    </li>
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
