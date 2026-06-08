import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { DAY_NAMES, daysInRange } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function AvailabilityPage() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState('');
  const [startDay, setStartDay] = useState('1');
  const [endDay, setEndDay] = useState('5');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [ruleToRemove, setRuleToRemove] = useState<{ id: string; label: string } | null>(null);

  const { data: accountsData } = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: !!orgId,
  });

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ['availability-rules', orgId, accountId],
    queryFn: () => orgApi.listAvailabilityRules(orgId, accountId),
    enabled: !!orgId && !!accountId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const days = daysInRange(Number(startDay), Number(endDay));
      if (days.length === 0) {
        throw new Error('End day must be on or after start day');
      }
      await Promise.all(
        days.map((dayOfWeek) =>
          orgApi.createAvailabilityRule(orgId, accountId, { dayOfWeek, startTime, endTime }),
        ),
      );
      return days.length;
    },
    onSuccess: (count) => {
      toast.success(count === 1 ? 'Availability rule added' : `${count} availability rules added`);
      queryClient.invalidateQueries({ queryKey: ['availability-rules', orgId, accountId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => orgApi.deleteAvailabilityRule(orgId, accountId, ruleId),
    onSuccess: () => {
      toast.success('Rule removed');
      queryClient.invalidateQueries({ queryKey: ['availability-rules', orgId, accountId] });
      setRuleToRemove(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const accounts = accountsData?.accounts ?? [];

  return (
    <div>
      <PageHeader title="Availability" description="Manage staff availability rules" />
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <Label>Staff member</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.firstName} {a.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From day</Label>
              <Select
                value={startDay}
                onValueChange={(value) => {
                  setStartDay(value);
                  if (Number(value) > Number(endDay)) setEndDay(value);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((name, i) => (
                    <SelectItem key={name} value={String(i)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To day</Label>
              <Select value={endDay} onValueChange={setEndDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((name, i) => (
                    <SelectItem key={name} value={String(i)} disabled={i < Number(startDay)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Start</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div><Label>End</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
            <div className="flex items-end">
              <Button onClick={() => createMutation.mutate()} disabled={!accountId || createMutation.isPending}>
                <Plus className="h-4 w-4" /> Add Rule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {!accountId ? (
        <p className="text-sm text-stone-500">Select a staff member to view availability rules.</p>
      ) : isLoading ? (
        <LoadingState />
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rulesData?.availabilityRules ?? []).map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{DAY_NAMES[rule.dayOfWeek]}</TableCell>
                  <TableCell>{rule.startTime}</TableCell>
                  <TableCell>{rule.endTime}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setRuleToRemove({
                          id: rule.id,
                          label: `${DAY_NAMES[rule.dayOfWeek]} ${rule.startTime}–${rule.endTime}`,
                        })
                      }
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <ConfirmDialog
        open={!!ruleToRemove}
        onOpenChange={(open) => !open && setRuleToRemove(null)}
        title="Remove availability rule?"
        description={
          ruleToRemove
            ? `Remove ${ruleToRemove.label}? This staff member will no longer be bookable during that time.`
            : ''
        }
        confirmLabel="Remove Rule"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => ruleToRemove && deleteMutation.mutate(ruleToRemove.id)}
      />
    </div>
  );
}
