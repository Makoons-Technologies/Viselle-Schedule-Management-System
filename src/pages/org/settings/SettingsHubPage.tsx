import { useState } from 'react';
import { ChevronRight, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AddToHomeScreenDialog } from '@/components/settings/AddToHomeScreenDialog';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { panelClassName } from '@/components/common/Panel';
import { getOrgSettingsHubGroups } from '@/components/layout/org-navigation';
import { useAuth } from '@/context/AuthContext';
import { useAddToHomeScreen } from '@/hooks/useAddToHomeScreen';
import { useOrgAdminAccess } from '@/hooks/useOrgAdminAccess';
import { useOrgId } from '@/hooks/useOrgId';
import { cn } from '@/lib/utils';

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
  const { showRow, canPrompt, platform, promptInstall } = useAddToHomeScreen();
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  async function handleAddToHomeScreen() {
    if (canPrompt) {
      const outcome = await promptInstall();
      if (outcome !== 'unavailable') return;
    }
    setInstructionsOpen(true);
  }

  return (
    <div className="mx-auto max-w-lg">
      <SettingsBackHeader title="Settings" backTo={`${orgBase}/dashboard`} />
      <div className={cn('overflow-hidden', panelClassName)}>
        {groups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {groupIndex > 0 ? <div className="border-t border-stone-200 dark:border-stone-800" /> : null}
            <ul>
              {group.items.map((item, itemIndex) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      'flex min-h-[3.25rem] items-center gap-4 px-4 py-3 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50',
                      itemIndex < group.items.length - 1 && 'border-b border-stone-100 dark:border-stone-800',
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0 text-stone-700 dark:text-stone-300" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 text-[0.9375rem] font-medium text-stone-900 dark:text-stone-100">{item.label}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {showRow ? (
          <div>
            <div className="border-t border-stone-200 dark:border-stone-800" />
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
          </div>
        ) : null}
      </div>
      <AddToHomeScreenDialog
        open={instructionsOpen}
        onOpenChange={setInstructionsOpen}
        platform={platform}
      />
    </div>
  );
}
