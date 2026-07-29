import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { orgApi, ownerApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { OrganizationStatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { helperTextClass } from '@/components/common/Panel';
import { cn, slugify } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { TRIAL_LOCKED_MESSAGE } from '@/lib/trial';

interface OrganizationSettingsSectionProps {
  orgId: string;
}

type OrgUpdatePayload = {
  name?: string;
  slug?: string;
  publicBookingEnabled?: boolean;
  batchCheckoutEnabled?: boolean;
  emailRemindersOptIn?: boolean;
  smsRemindersOptIn?: boolean;
  emailReminderHoursBefore?: number;
  smsReminderHoursBefore?: number;
  confirmationRequestsOptIn?: boolean;
  confirmationDaysBefore?: number;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
};

export function OrganizationSettingsSection({ orgId }: OrganizationSettingsSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isPlatformOwner = user?.role === 'platform_owner';
  const { plan } = useOrgPlan(orgId);
  const trialExpired = useOrgWriteLocked();

  const { data, isLoading } = useQuery({
    queryKey: ['organization', orgId, user?.role],
    queryFn: () =>
      isPlatformOwner ? ownerApi.getOrganization(orgId) : orgApi.getOrganization(orgId),
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: OrgUpdatePayload) =>
      isPlatformOwner
        ? ownerApi.updateOrganization(orgId, payload)
        : orgApi.updateOrganization(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'organizations'] });
      queryClient.invalidateQueries({ queryKey: ['website', orgId] });
      toast.success('Settings saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState />;

  const org = data?.organization;
  if (!org) return null;

  const emailPlanEnabled = plan?.emailRemindersEnabled ?? true;
  const smsPlanEnabled = plan?.smsRemindersEnabled ?? true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organization</CardTitle>
      </CardHeader>
      <CardContent>
        <fieldset
          disabled={trialExpired}
          title={trialExpired ? TRIAL_LOCKED_MESSAGE : undefined}
          className="m-0 min-w-0 space-y-4 border-0 p-0"
        >
        <div>
          <Label>Status</Label>
          <div className="mt-1"><OrganizationStatusBadge status={org.status} /></div>
        </div>
        <div>
          <Label>Business name</Label>
          <Input
            defaultValue={org.name}
            onBlur={(e) => {
              if (e.target.value !== org.name) {
                updateMutation.mutate({ name: e.target.value });
              }
            }}
          />
        </div>
        <div>
          <Label>Public booking slug</Label>
          <Input
            key={`slug-${org.slug}-${org.updatedAt}`}
            defaultValue={org.slug}
            disabled={updateMutation.isPending}
            onBlur={(e) => {
              const next = slugify(e.target.value);
              e.target.value = next;
              if (!next || next.length < 2) {
                toast.error('Slug must be at least 2 characters');
                e.target.value = org.slug;
                return;
              }
              if (next !== org.slug) {
                updateMutation.mutate({ slug: next });
              }
            }}
          />
          <p className={cn('mt-1', helperTextClass)}>
            Booking URL: /book/{org.slug}. Changing this breaks the old link.
          </p>
        </div>

        <div className="space-y-3 border-t border-stone-200 pt-4 dark:border-stone-800">
          <div>
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Business details</p>
            <p className={helperTextClass}>Used in appointment reminders and calendar invites.</p>
          </div>
          <div>
            <Label>City</Label>
            <Input
              defaultValue={org.city ?? ''}
              placeholder="Austin"
              onBlur={(e) => {
                const next = e.target.value.trim() || null;
                if (next !== (org.city ?? null)) {
                  updateMutation.mutate({ city: next });
                }
              }}
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input
              defaultValue={org.address ?? ''}
              placeholder="Optional street address"
              onBlur={(e) => {
                const next = e.target.value.trim() || null;
                if (next !== (org.address ?? null)) {
                  updateMutation.mutate({ address: next });
                }
              }}
            />
          </div>
          <div>
            <Label>Business phone</Label>
            <Input
              defaultValue={org.phone ?? ''}
              placeholder="Optional"
              onBlur={(e) => {
                const next = e.target.value.trim() || null;
                if (next !== (org.phone ?? null)) {
                  updateMutation.mutate({ phone: next });
                }
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Label>Public booking enabled</Label>
            <p className={helperTextClass}>
              Allow customers to book online. Enables your free booking page under Booking website.
            </p>
          </div>
          <Switch
            checked={org.publicBookingEnabled}
            onCheckedChange={(v) => updateMutation.mutate({ publicBookingEnabled: v })}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Label>Batch checkout</Label>
            <p className={helperTextClass}>
              Let staff select multiple checked-in appointments on the calendar and take one combined payment.
            </p>
          </div>
          <Switch
            checked={org.batchCheckoutEnabled}
            onCheckedChange={(v) => updateMutation.mutate({ batchCheckoutEnabled: v })}
          />
        </div>

        <div className="space-y-4 border-t border-stone-200 pt-4 dark:border-stone-800">
          <div>
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Reminders</p>
            <p className={helperTextClass}>
              Enabled channels get an immediate notice when an appointment is booked, updated, or
              cancelled (with calendar links on book/update), plus a later reminder at the hours you
              set below.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Label>Email reminders</Label>
                {!emailPlanEnabled ? (
                  <p className={helperTextClass}>Not included in your plan</p>
                ) : (
                  <p className={helperTextClass}>Send an email reminder before the appointment</p>
                )}
              </div>
              <Switch
                checked={org.emailRemindersOptIn}
                disabled={!emailPlanEnabled || updateMutation.isPending}
                onCheckedChange={(v) => updateMutation.mutate({ emailRemindersOptIn: v })}
              />
            </div>
            <div>
              <Label htmlFor="email-hours">Hours before (email)</Label>
              <Input
                id="email-hours"
                key={`email-hours-${org.emailReminderHoursBefore}-${org.updatedAt}`}
                type="number"
                min={1}
                max={168}
                defaultValue={org.emailReminderHoursBefore}
                disabled={!emailPlanEnabled || !org.emailRemindersOptIn || updateMutation.isPending}
                onBlur={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isInteger(next) || next < 1 || next > 168) {
                    toast.error('Email hours must be between 1 and 168');
                    e.target.value = String(org.emailReminderHoursBefore);
                    return;
                  }
                  if (next !== org.emailReminderHoursBefore) {
                    updateMutation.mutate({ emailReminderHoursBefore: next });
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Label>Text (SMS) reminders</Label>
                {!smsPlanEnabled ? (
                  <p className={helperTextClass}>Not included in your plan</p>
                ) : (
                  <p className={helperTextClass}>Send a text reminder before the appointment</p>
                )}
              </div>
              <Switch
                checked={org.smsRemindersOptIn}
                disabled={!smsPlanEnabled || updateMutation.isPending}
                onCheckedChange={(v) => updateMutation.mutate({ smsRemindersOptIn: v })}
              />
            </div>
            <div>
              <Label htmlFor="sms-hours">Hours before (SMS)</Label>
              <Input
                id="sms-hours"
                key={`sms-hours-${org.smsReminderHoursBefore}-${org.updatedAt}`}
                type="number"
                min={1}
                max={168}
                defaultValue={org.smsReminderHoursBefore}
                disabled={!smsPlanEnabled || !org.smsRemindersOptIn || updateMutation.isPending}
                onBlur={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isInteger(next) || next < 1 || next > 168) {
                    toast.error('SMS hours must be between 1 and 168');
                    e.target.value = String(org.smsReminderHoursBefore);
                    return;
                  }
                  if (next !== org.smsReminderHoursBefore) {
                    updateMutation.mutate({ smsReminderHoursBefore: next });
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-stone-200 pt-4 dark:border-stone-800">
          <div>
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
              Confirmation requests
            </p>
            <p className={helperTextClass}>
              Customers receive a link to confirm they will attend, by default 3 days before the
              appointment. Uses the same email/SMS channels as reminders.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Label>Send confirmation requests</Label>
                <p className={helperTextClass}>Ask customers to confirm ahead of time</p>
              </div>
              <Switch
                checked={org.confirmationRequestsOptIn ?? true}
                disabled={updateMutation.isPending}
                onCheckedChange={(v) => updateMutation.mutate({ confirmationRequestsOptIn: v })}
              />
            </div>
            <div>
              <Label htmlFor="confirmation-days">Days before appointment</Label>
              <Input
                id="confirmation-days"
                key={`confirmation-days-${org.confirmationDaysBefore ?? 3}-${org.updatedAt}`}
                type="number"
                min={1}
                max={30}
                defaultValue={org.confirmationDaysBefore ?? 3}
                disabled={!(org.confirmationRequestsOptIn ?? true) || updateMutation.isPending}
                onBlur={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isInteger(next) || next < 1 || next > 30) {
                    toast.error('Confirmation days must be between 1 and 30');
                    e.target.value = String(org.confirmationDaysBefore ?? 3);
                    return;
                  }
                  if (next !== (org.confirmationDaysBefore ?? 3)) {
                    updateMutation.mutate({ confirmationDaysBefore: next });
                  }
                }}
              />
            </div>
          </div>
        </div>

        {updateMutation.isPending && <p className={helperTextClass}>Saving…</p>}
        </fieldset>
      </CardContent>
    </Card>
  );
}
