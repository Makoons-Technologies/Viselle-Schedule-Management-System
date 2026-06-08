import { useParams } from 'react-router-dom';
import { useOrg } from '@/context/OrgContext';

export function useOrgId() {
  const { orgId } = useParams<{ orgId: string }>();
  const { effectiveOrgId } = useOrg();
  return orgId ?? effectiveOrgId ?? '';
}
