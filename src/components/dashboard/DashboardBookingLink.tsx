import { useQuery } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { orgApi, ownerApi } from '@/lib/api';
import { displayBookingHost, getShareableBookingLink } from '@/lib/public-booking';
import { Button } from '@/components/ui/button';

export function DashboardBookingLink({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const isPlatformOwner = user?.role === 'platform_owner';

  const { data } = useQuery({
    queryKey: ['website', orgId, user?.role],
    queryFn: () => (isPlatformOwner ? ownerApi.getWebsite(orgId) : orgApi.getWebsite(orgId)),
    enabled: !!orgId,
  });

  if (!data) return null;

  const { url, kind } = getShareableBookingLink(data);
  const label = kind === 'custom' ? 'Custom site' : kind === 'subdomain' ? 'Booking page' : 'Booking link';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Booking link copied');
    } catch {
      toast.error('Could not copy booking link');
    }
  };

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2 sm:items-end">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</p>
      <div className="flex min-w-0 items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title={url}
          className="min-w-0 truncate font-mono text-sm text-brand-700 hover:underline dark:text-brand-300"
        >
          {displayBookingHost(url)}
        </a>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => void copyLink()}>
          <Copy className="h-4 w-4" />
          Copy booking link
        </Button>
      </div>
    </div>
  );
}
