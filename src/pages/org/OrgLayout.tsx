import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';

export function OrgLayout() {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuth();
  const { setSelectedOrgId, selectedOrg } = useOrg();

  useEffect(() => {
    if (user?.role === 'platform_owner' && orgId) {
      setSelectedOrgId(orgId);
    }
  }, [orgId, user?.role, setSelectedOrgId]);

  return (
    <div>
      {selectedOrg && user?.role === 'platform_owner' && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-stone-900">{selectedOrg.name}</h2>
          <p className="text-sm text-stone-500">{selectedOrg.slug}</p>
        </div>
      )}
      <Outlet />
    </div>
  );
}
