import { ChevronRight, Smartphone } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AddToHomeScreenDialog } from '@/components/settings/AddToHomeScreenDialog';
import { PushNotificationsCard } from '@/components/settings/PushNotificationsCard';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { panelClassName } from '@/components/common/Panel';
import { getOrgSettingsHubGroups, type OrgNavLink, type SettingsHubGroup } from '@/components/layout/org-navigation';
import { useAuth } from '@/context/AuthContext';
import { useAddToHomeScreen } from '@/hooks/useAddToHomeScreen';
import { useOrgAdminAccess } from '@/hooks/useOrgAdminAccess';
import { useOrgId } from '@/hooks/useOrgId';
import { cn } from '@/lib/utils';

function SettingsHubRow({
  item,
  showDivider,
}: {
  item: OrgNavLink;
  showDivider: boolean;
}) {
  const rowClassName = cn(
    'flex min-h-[3.25rem] items-center gap-4 px-4 py-3 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50',
    showDivider && 'border-b border-stone-100 dark:border-stone-800',
  );

  return item.external ? (
    <a href={item.to} target="_blank" rel="noreferrer" className={rowClassName}>
      <item.icon className="h-5 w-5 shrink-0 text-stone-700 dark:text-stone-300" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 text-[0.9375rem] font-medium text-stone-900 dark:text-stone-100">{item.label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
    </a>
  ) : (
    <Link to={item.to} className={rowClassName}>
      <item.icon className="h-5 w-5 shrink-0 text-stone-700 dark:text-stone-300" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 text-[0.9375rem] font-medium text-stone-900 dark:text-stone-100">{item.label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
    </Link>
  );
}

function SettingsHubSection({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-hidden', panelClassName, className)}>{children}</div>;
}

function SettingsHubGroupList({ group }: { group: SettingsHubGroup }) {
  return (
    <ul>
      {group.items.map((item, itemIndex) => (
        <li key={item.to}>
          <SettingsHubRow item={item} showDivider={itemIndex < group.items.length - 1} />
        </li>
      ))}
    </ul>
  );
}

export function SettingsHubPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const orgBase = `/orgs/${orgId}`;
  const showAdmin = user?.role === 'org_owner' || user?.role === 'platform_owner';
  const showStaffPermissions = useOrgAdminAccess(orgId);
  const groups = getOrgSettingsHubGroups(orgBase, {
    showAdminSettings: showAdmin,
    showStaffPermissions,
  });
  const {
    showRow,
    platform,
    handleAddToHomeScreen,
    instructionsOpen,
    setInstructionsOpen,
  } = useAddToHomeScreen();

  const legalGroup = groups[groups.length - 1];
  const mainGroups = groups.slice(0, -1);

  return (
    <div className="mx-auto max-w-lg">
      <SettingsBackHeader title="Settings" backTo={`${orgBase}/dashboard`} />
      <div className="flex flex-col gap-6">
        {mainGroups.map((group, groupIndex) => (
          <SettingsHubSection key={groupIndex}>
            <SettingsHubGroupList group={group} />
          </SettingsHubSection>
        ))}
        <PushNotificationsCard />
        {showRow ? (
          <SettingsHubSection>
            <ul>
              <li>
                <button
                  type="button"
                  onClick={() => void handleAddToHomeScreen()}
                  className="flex min-h-[3.25rem] w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50"
                >
                  <Smartphone className="h-5 w-5 shrink-0 text-stone-700 dark:text-stone-300" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 text-[0.9375rem] font-medium text-stone-900 dark:text-stone-100">
                    Add to Home Screen
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
                </button>
              </li>
            </ul>
          </SettingsHubSection>
        ) : null}
        <SettingsHubSection className="mt-4">
          <SettingsHubGroupList group={legalGroup} />
        </SettingsHubSection>
      </div>
      <AddToHomeScreenDialog
        open={instructionsOpen}
        onOpenChange={setInstructionsOpen}
        platform={platform}
      />
    </div>
  );
}
