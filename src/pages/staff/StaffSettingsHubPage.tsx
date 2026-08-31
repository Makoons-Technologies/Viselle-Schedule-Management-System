import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Clock, Shield, UserCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { panelClassName, sectionMutedClass } from '@/components/common/Panel';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useOrgAdminAccess } from '@/hooks/useOrgAdminAccess';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { orgApi } from '@/lib/api';
import { redirectToStripeUrl } from '@/lib/safe-redirect';
import { cn } from '@/lib/utils';

export function StaffSettingsHubPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId ?? '';
  const accountId = user?.accountId ?? '';
  const canManageStaff = useOrgAdminAccess(orgId);
  const writeLocked = useOrgWriteLocked();
  const orgBase = `/orgs/${orgId}`;
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const syncedRef = useRef(false);

  const payoutQuery = useQuery({
    queryKey: ['staff-payouts', orgId],
    queryFn: () => orgApi.getStaffPayoutSettings(orgId),
    enabled: !!orgId,
  });
  const myRecipient = payoutQuery.data?.recipients.find((row) => row.accountId === accountId);
  const showBank = payoutQuery.data?.mode === 'salon_stripe';

  const onboardMutation = useMutation({
    mutationFn: () => orgApi.startStaffPayoutOnboarding(orgId, accountId),
    onSuccess: (result) => {
      if (!redirectToStripeUrl(result.url)) toast.error('Received an unexpected onboarding URL');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!accountId || !orgId || syncedRef.current) return;
    if (searchParams.get('staff_payout') !== '1' && searchParams.get('staff_payout') !== 'refresh') return;
    syncedRef.current = true;
    void orgApi.syncStaffPayoutRecipient(orgId, accountId).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['staff-payouts', orgId] });
    });
  }, [accountId, orgId, queryClient, searchParams]);

  const items = [
    { label: 'Hours', to: '/staff/availability', icon: Clock },
    { label: 'Account', to: `${orgBase}/settings/account`, icon: UserCircle },
    ...(canManageStaff && !writeLocked
      ? [{ label: 'Staff permissions', to: '/staff/settings/staff-permissions', icon: Shield }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-lg">
      <SettingsBackHeader title="Settings" backTo={`${orgBase}/dashboard`} />
      <div className={cn('overflow-hidden', panelClassName)}>
        <ul>
          {items.map((item, index) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  'flex min-h-[3.25rem] items-center gap-4 px-4 py-3 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50',
                  index < items.length - 1 && 'border-b border-stone-100 dark:border-stone-800',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0 text-stone-700 dark:text-stone-300" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 text-[0.9375rem] font-medium text-stone-900 dark:text-stone-100">
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {showBank ? (
        <div className={cn('mt-6 p-4', panelClassName)}>
          <p className="font-medium">Payout bank</p>
          <p className={cn('mt-1 text-sm', sectionMutedClass)}>
            {myRecipient?.payoutsReady
              ? 'Your bank is ready for salon Stripe transfers. This is not payroll.'
              : 'Add a bank if your salon pays commissions from Stripe. This is not W-2 or 1099 payroll.'}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            disabled={writeLocked || onboardMutation.isPending || !accountId}
            onClick={() => onboardMutation.mutate()}
          >
            {myRecipient?.payoutsReady ? 'Update bank' : 'Add bank'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
