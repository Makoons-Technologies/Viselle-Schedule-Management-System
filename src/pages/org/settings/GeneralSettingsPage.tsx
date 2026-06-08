import { useOrgId } from '@/hooks/useOrgId';
import { BillingSection } from '@/components/settings/BillingSection';
import { ThemeSettingsSection } from '@/components/settings/ThemeSettingsSection';

export function GeneralSettingsPage() {
  const orgId = useOrgId();

  return (
    <div className="max-w-2xl space-y-6">
      <ThemeSettingsSection />
      <BillingSection orgId={orgId} />
    </div>
  );
}