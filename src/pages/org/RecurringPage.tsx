import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Repeat, Trash2, Wrench } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { useOrgTrialExpired } from '@/hooks/useOrgTrialExpired';
import type { RecurringAppointmentRule } from '@/types/api';
import { PlanUpsell } from '@/components/common/PlanUpsell';
import { EditRecurringDialog } from '@/components/appointments/EditRecurringDialog';
import {
  dayTimesFromRule,
  daysOfWeekFromRule,
  formatDayTimesSummary,
  upcomingSkippedDatesFromRule,
} from '@/components/appointments/recurring-options';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TableIconButton, TableRowActions } from '@/components/common/TableIconButton';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Panel, sectionHeadingClass, sectionMutedClass } from '@/components/common/Panel';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function formatFrequency(rule: RecurringAppointmentRule): string {
  switch (rule.frequency) {
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Every 2 weeks';
    case 'monthly':
      return 'Monthly';
    case 'custom':
      return `Every ${rule.interval} weeks`;
  }
}

function RecurringRuleDetails({ rule }: { rule: RecurringAppointmentRule }) {
  const skippedDates = upcomingSkippedDatesFromRule(rule);
  const dayTimes = formatDayTimesSummary(daysOfWeekFromRule(rule), dayTimesFromRule(rule));

  return (
    <>
      <p className="font-medium">{formatFrequency(rule)}</p>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{dayTimes}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600 dark:text-stone-400">
        <span>Start {formatDate(rule.startDate)}</span>
        <span>End {rule.endDate ? formatDate(rule.endDate) : '—'}</span>
      </div>
      {skippedDates.length > 0 && (
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          Skipped: {skippedDates.map((date) => formatDate(date)).join(', ')}
        </p>
      )}
    </>
  );
}

function RecurringRuleActions({
  rule,
  onEdit,
  onDelete,
  compact,
  trialLocked,
}: {
  rule: RecurringAppointmentRule;
  onEdit: (rule: RecurringAppointmentRule) => void;
  onDelete: (rule: RecurringAppointmentRule) => void;
  compact?: boolean;
  trialLocked: boolean;
}) {
  return (
    <TableRowActions className={compact ? 'w-full' : undefined}>
      {rule.status !== 'cancelled' && (
        <TrialLockedControl locked={trialLocked}>
          <TableIconButton
            icon={Wrench}
            label="Edit recurring series"
            onClick={() => onEdit(rule)}
            disabled={trialLocked}
          />
        </TrialLockedControl>
      )}
      <TrialLockedControl locked={trialLocked}>
        <TableIconButton
          icon={Trash2}
          label="Delete recurring series"
          destructive
          onClick={() => onDelete(rule)}
          disabled={trialLocked}
        />
      </TrialLockedControl>
    </TableRowActions>
  );
}

function RecurringRuleCard({
  rule,
  onEdit,
  onDelete,
  trialLocked,
}: {
  rule: RecurringAppointmentRule;
  onEdit: (rule: RecurringAppointmentRule) => void;
  onDelete: (rule: RecurringAppointmentRule) => void;
  trialLocked: boolean;
}) {
  return (
    <div className="space-y-3 border-b border-stone-100 p-4 last:border-b-0 dark:border-stone-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <RecurringRuleDetails rule={rule} />
        </div>
        <Badge variant={rule.status === 'active' ? 'success' : 'secondary'} className="shrink-0">
          {rule.status === 'cancelled' ? 'ended' : rule.status}
        </Badge>
      </div>
      <RecurringRuleActions rule={rule} onEdit={onEdit} onDelete={onDelete} compact trialLocked={trialLocked} />
    </div>
  );
}

function RecurringRulesTable({
  rules,
  onEdit,
  onDelete,
  trialLocked,
}: {
  rules: RecurringAppointmentRule[];
  onEdit: (rule: RecurringAppointmentRule) => void;
  onDelete: (rule: RecurringAppointmentRule) => void;
  trialLocked: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Schedule</TableHead>
          <TableHead>Days & times</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-40" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => {
          const skippedDates = upcomingSkippedDatesFromRule(rule);
          return (
            <TableRow key={rule.id}>
              <TableCell>
                <p className="font-medium">{formatFrequency(rule)}</p>
                {skippedDates.length > 0 && (
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    Skipped: {skippedDates.map((date) => formatDate(date)).join(', ')}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {formatDayTimesSummary(daysOfWeekFromRule(rule), dayTimesFromRule(rule))}
              </TableCell>
              <TableCell>{formatDate(rule.startDate)}</TableCell>
              <TableCell>{rule.endDate ? formatDate(rule.endDate) : '—'}</TableCell>
              <TableCell>
                <Badge variant={rule.status === 'active' ? 'success' : 'secondary'}>
                  {rule.status === 'cancelled' ? 'ended' : rule.status}
                </Badge>
              </TableCell>
              <TableCell>
                <RecurringRuleActions rule={rule} onEdit={onEdit} onDelete={onDelete} trialLocked={trialLocked} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function RecurringRulesList({
  rules,
  onEdit,
  onDelete,
  trialLocked,
}: {
  rules: RecurringAppointmentRule[];
  onEdit: (rule: RecurringAppointmentRule) => void;
  onDelete: (rule: RecurringAppointmentRule) => void;
  trialLocked: boolean;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="md:hidden">
        {rules.map((rule) => (
          <RecurringRuleCard key={rule.id} rule={rule} onEdit={onEdit} onDelete={onDelete} trialLocked={trialLocked} />
        ))}
      </div>
      <div className="hidden md:block">
        <RecurringRulesTable rules={rules} onEdit={onEdit} onDelete={onDelete} trialLocked={trialLocked} />
      </div>
    </Panel>
  );
}

export function RecurringPage() {
  const orgId = useOrgId();
  const { plan, isLoading: planLoading } = useOrgPlan(orgId);
  const trialExpired = useOrgTrialExpired();
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<RecurringAppointmentRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<RecurringAppointmentRule | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['recurring', orgId],
    queryFn: () => orgApi.listRecurring(orgId),
    enabled: !!orgId,
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => orgApi.deleteRecurring(orgId, ruleId),
    onSuccess: () => {
      toast.success('Recurring series deleted');
      queryClient.invalidateQueries({ queryKey: ['recurring', orgId] });
      queryClient.invalidateQueries({ queryKey: ['appointments', orgId] });
      setDeletingRule(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || planLoading) return <LoadingState />;

  if (plan && !plan.recurringAppointmentsEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Recurring Appointments"
          description="Set standing appointments for regular clients — weekly blowouts, monthly facials, and more."
        />
        <PlanUpsell
          title="Recurring appointments aren’t on your plan"
          description="Upgrade to Professional or Business to schedule repeating appointments automatically. Your Starter plan still includes one-time booking and email reminders."
          featureLabel="Recurring appointments"
        />
      </div>
    );
  }

  const rules = data?.recurringAppointmentRules ?? [];
  const activeRules = rules.filter((rule) => rule.status === 'active' || rule.status === 'paused');
  const endedRules = rules.filter((rule) => rule.status === 'cancelled');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Recurring Appointments"
        description="Active series appear on the calendar. Cancel on an appointment skips only that date; Delete Series stops the whole schedule."
      />
      {rules.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring rules"
          description="Create a recurring series from an appointment or when booking a new appointment."
        />
      ) : (
        <>
          {activeRules.length > 0 && (
            <section className="space-y-3">
              <h2 className={sectionHeadingClass}>Active series</h2>
              <RecurringRulesList
                rules={activeRules}
                onEdit={setEditingRule}
                onDelete={setDeletingRule}
                trialLocked={trialExpired}
              />
            </section>
          )}
          {endedRules.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className={sectionHeadingClass}>Ended series</h2>
                <p className={sectionMutedClass}>
                  These no longer appear on the calendar. Delete to remove them from this list.
                </p>
              </div>
              <RecurringRulesList
                rules={endedRules}
                onEdit={setEditingRule}
                onDelete={setDeletingRule}
                trialLocked={trialExpired}
              />
            </section>
          )}
        </>
      )}
      <EditRecurringDialog
        orgId={orgId}
        rule={editingRule}
        open={!!editingRule}
        onOpenChange={(open) => !open && setEditingRule(null)}
      />
      <ConfirmDialog
        open={!!deletingRule}
        onOpenChange={(open) => !open && setDeletingRule(null)}
        title="Delete recurring series?"
        description={
          deletingRule
            ? `This permanently removes the recurring rule and cancels linked appointments (${formatDayTimesSummary(daysOfWeekFromRule(deletingRule), dayTimesFromRule(deletingRule))}). This cannot be undone.`
            : ''
        }
        confirmLabel="Delete Series"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deletingRule && deleteMutation.mutate(deletingRule.id)}
      />
    </div>
  );
}
