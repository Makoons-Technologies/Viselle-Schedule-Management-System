import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError, ownerApi } from '@/lib/api';
import { ListToolbar, matchesSearch } from '@/components/common/ListToolbar';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomWebsiteStatusBadge } from '@/components/customWebsites/CustomWebsiteStatusBadge';
import type { CustomWebsiteRequestStatus, Organization } from '@/types/api';

const STATUS_FILTERS: Array<{ value: CustomWebsiteRequestStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'closed', label: 'Closed' },
];

const NONE_ORG = '__none__';

function existingRequestId(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const details = error.details;
  if (!details || typeof details !== 'object' || !('requestId' in details)) return null;
  const requestId = (details as { requestId?: unknown }).requestId;
  return typeof requestId === 'string' ? requestId : null;
}

export function PlatformCustomWebsitesPage() {
  const [status, setStatus] = useState<CustomWebsiteRequestStatus | 'all'>('open');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['custom-website-requests', 'inbox', status],
    queryFn: () => ownerApi.listCustomWebsiteRequests(status === 'all' ? undefined : { status }),
  });

  const requests = data?.requests ?? [];
  const filtered = useMemo(
    () =>
      requests.filter((request) =>
        matchesSearch(
          search,
          request.businessName,
          request.contactName,
          request.contactEmail,
        ),
      ),
    [requests, search],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Custom websites"
        description="Build requests from Get Started, or add one here. Open a request to set the live URL and go live — that locks the Viselle-built site on the org."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add request
          </Button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search business, contact…"
        filters={
          <Select value={status} onValueChange={(v) => setStatus(v as CustomWebsiteRequestStatus | 'all')}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No requests"
          description={
            requests.length === 0
              ? 'Nothing matches this filter right now.'
              : 'Try a different search.'
          }
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add request
            </Button>
          }
        />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Org</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    <Link to={`/platform/custom-websites/${request.id}`} className="block hover:underline">
                      {request.businessName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-stone-500">
                    <div>{request.contactName}</div>
                    <div className="text-xs text-stone-400">{request.contactEmail}</div>
                  </TableCell>
                  <TableCell>
                    {request.organizationId ? (
                      <Link
                        to={`/platform/organizations/${request.organizationId}/settings`}
                        className="text-xs text-brand-700 hover:underline dark:text-brand-300"
                      >
                        Org settings
                      </Link>
                    ) : (
                      <span className="text-xs text-stone-400">Not attached</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <CustomWebsiteStatusBadge status={request.status} />
                  </TableCell>
                  <TableCell className="text-stone-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      <CreateRequestDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [organizationId, setOrganizationId] = useState(NONE_ORG);

  const { data: orgsData } = useQuery({
    queryKey: ['owner', 'organizations'],
    queryFn: ownerApi.listOrganizations,
    enabled: open,
  });

  const organizations = useMemo(() => {
    const list = orgsData?.organizations ?? [];
    const rank = (org: Organization) => (org.isDev ? 1 : 0);
    return [...list].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [orgsData?.organizations]);

  useEffect(() => {
    if (!open) return;
    setBusinessName('');
    setContactName('');
    setContactEmail('');
    setOrganizationId(NONE_ORG);
  }, [open]);

  const { data: selectedOrgData } = useQuery({
    queryKey: ['owner-org', organizationId],
    queryFn: () => ownerApi.getOrganization(organizationId),
    enabled: open && organizationId !== NONE_ORG,
  });

  useEffect(() => {
    if (!selectedOrgData) return;
    if (organizationId !== selectedOrgData.organization.id) return;
    const org = selectedOrgData.organization;
    const owner = selectedOrgData.owner;
    setBusinessName((current) => current.trim() || org.name);
    setContactEmail((current) => current.trim() || owner?.email || '');
  }, [selectedOrgData, organizationId]);

  const canSubmit =
    businessName.trim().length > 0 && contactName.trim().length > 0 && contactEmail.trim().length > 0;

  const mutation = useMutation({
    mutationFn: () =>
      ownerApi.createCustomWebsiteRequest({
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        organizationId: organizationId === NONE_ORG ? null : organizationId,
      }),
    onSuccess: ({ request }) => {
      toast.success('Request added');
      queryClient.invalidateQueries({ queryKey: ['custom-website-requests'] });
      onOpenChange(false);
      navigate(`/platform/custom-websites/${request.id}`);
    },
    onError: (err: Error) => {
      const requestId = existingRequestId(err);
      if (requestId) {
        toast.error(err.message);
        onOpenChange(false);
        navigate(`/platform/custom-websites/${requestId}`);
        return;
      }
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add custom website request</DialogTitle>
          <DialogDescription>
            Use this when someone asked for a Viselle-built site outside Get Started. Attach an org if they already
            have one.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) mutation.mutate();
          }}
        >
          <div>
            <Label htmlFor="cwr-org">Organization (optional)</Label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger id="cwr-org" className="mt-1">
                <SelectValue placeholder="Not attached yet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_ORG}>Not attached yet</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.isDev ? `[DEV] ${org.name}` : org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cwr-business">Business name</Label>
            <Input
              id="cwr-business"
              className="mt-1"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Serenity Spa"
            />
          </div>
          <div>
            <Label htmlFor="cwr-contact">Contact name</Label>
            <Input
              id="cwr-contact"
              className="mt-1"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Jordan Lee"
            />
          </div>
          <div>
            <Label htmlFor="cwr-email">Contact email</Label>
            <Input
              id="cwr-email"
              type="email"
              className="mt-1"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="owner@example.com"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? 'Adding…' : 'Add request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
