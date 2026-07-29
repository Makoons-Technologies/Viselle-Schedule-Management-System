import { useEffect } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { Button } from '@/components/ui/button';

export function PlatformOrgLayout() {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuth();
  const { setSelectedOrgId, selectedOrg, organizations } = useOrg();

  useEffect(() => {
    if (user?.role === 'platform_owner' && orgId) {
      setSelectedOrgId(orgId);
    }
  }, [orgId, user?.role, setSelectedOrgId]);

  const org = selectedOrg ?? organizations.find((o) => o.id === orgId);

  return (
    <div>
      <Link
        to="/platform/organizations"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Back to Organizations
      </Link>
      {org && (
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{org.name}</h2>
            <p className="text-sm text-stone-500 dark:text-stone-300">Platform administration · /{org.slug}</p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to={`/orgs/${org.id}/dashboard`}>
              <ExternalLink className="h-4 w-4" />
              Open salon
            </Link>
          </Button>
        </div>
      )}
      <Outlet />
    </div>
  );
}
