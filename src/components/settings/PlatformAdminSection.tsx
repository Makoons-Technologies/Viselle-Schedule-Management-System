import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { centsToDollars, dollarsToCents } from '@/lib/utils';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { OrganizationSettings } from '@/types/api';

interface PlatformAdminSectionProps {
  orgId: string;
}

export function PlatformAdminSection({ orgId }: PlatformAdminSectionProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['owner-settings', orgId],
    queryFn: () => ownerApi.getSettings(orgId),
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<OrganizationSettings>) =>
      ownerApi.updateSettings(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-settings', orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState />;

  const settings = data?.settings;
  if (!settings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Platform administration</CardTitle>
        <p className="text-sm text-stone-500">Platform-only controls for this organization</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { key: 'smsRemindersEnabled' as const, label: 'SMS Reminders' },
          { key: 'emailRemindersEnabled' as const, label: 'Email Reminders' },
          { key: 'recurringAppointmentsEnabled' as const, label: 'Recurring Appointments' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <Label>{label}</Label>
            <Switch
              checked={settings[key]}
              onCheckedChange={(v) => updateMutation.mutate({ [key]: v })}
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Max staff accounts</Label>
            <Input
              type="number"
              defaultValue={settings.maxStaffAccounts}
              onBlur={(e) => updateMutation.mutate({ maxStaffAccounts: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Monthly price ($)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              key={settings.monthlyPriceCents}
              defaultValue={centsToDollars(settings.monthlyPriceCents)}
              onBlur={(e) => {
                const dollars = Number(e.target.value);
                if (!Number.isNaN(dollars)) {
                  updateMutation.mutate({ monthlyPriceCents: dollarsToCents(dollars) });
                }
              }}
            />
          </div>
        </div>
        <div>
          <Label>Internal notes</Label>
          <Textarea
            defaultValue={settings.internalNotes ?? ''}
            onBlur={(e) => updateMutation.mutate({ internalNotes: e.target.value })}
          />
        </div>
        {updateMutation.isPending && <p className="text-xs text-stone-500">Saving…</p>}
      </CardContent>
    </Card>
  );
}
