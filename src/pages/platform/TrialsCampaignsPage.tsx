import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel, sectionMutedClass } from '@/components/common/Panel';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TrialCampaign, TrialCampaignType, TrialPaymentMode } from '@/types/api';

const PAYMENT_MODE_LABEL: Record<TrialPaymentMode, string> = {
  stripe_trial: 'Stripe trial (card now)',
  free_no_card: 'Free (no card)',
};

function useCopyToClipboard() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copiedKey: copied,
    copy: async (key: string, value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(key);
        toast.success('Copied to clipboard');
        window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
      } catch {
        toast.error('Could not copy to clipboard');
      }
    },
  };
}

function CopyButton({ label, copied, onCopy }: { label: string; copied: boolean; onCopy: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onCopy} title={label}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="ml-1.5">{label}</span>
    </Button>
  );
}

interface CampaignFormState {
  name: string;
  type: TrialCampaignType;
  code: string;
  durationDays: string;
  maxRedemptions: string;
  paymentMode: TrialPaymentMode;
  enabled: boolean;
}

const EMPTY_FORM: CampaignFormState = {
  name: '',
  type: 'code',
  code: '',
  durationDays: '14',
  maxRedemptions: '1',
  paymentMode: 'free_no_card',
  enabled: false,
};

function CreateCampaignDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CampaignFormState>(EMPTY_FORM);

  const mutation = useMutation({
    mutationFn: () =>
      ownerApi.createTrialCampaign({
        name: form.name.trim(),
        type: form.type,
        code: form.type === 'code' ? form.code.trim() : undefined,
        durationDays: Number(form.durationDays),
        maxRedemptions: form.type === 'code' ? Number(form.maxRedemptions) : undefined,
        paymentMode: form.paymentMode,
        enabled: form.enabled,
      }),
    onSuccess: () => {
      toast.success('Campaign created');
      queryClient.invalidateQueries({ queryKey: ['owner', 'trials', 'campaigns'] });
      setForm(EMPTY_FORM);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSubmit =
    form.name.trim().length > 0 &&
    Number(form.durationDays) >= 1 &&
    (form.type === 'homepage' || (form.code.trim().length >= 3 && Number(form.maxRedemptions) >= 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New trial campaign</DialogTitle>
          <DialogDescription>
            Code campaigns share one code for printed/shared use; homepage campaigns power the public trial CTA.
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
            <Label>Campaign name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Spring open house"
            />
          </div>

          <div>
            <Label>Type</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(['code', 'homepage'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type }))}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.type === type
                      ? 'border-brand-500 bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-100'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:text-stone-300'
                  }`}
                >
                  {type === 'code' ? 'Shared code' : 'Homepage'}
                </button>
              ))}
            </div>
          </div>

          {form.type === 'code' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="SPRING2026"
                />
              </div>
              <div>
                <Label>Max uses</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxRedemptions}
                  onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (days)</Label>
              <Input
                type="number"
                min={1}
                value={form.durationDays}
                onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
              />
            </div>
            <div>
              <Label>Payment mode</Label>
              <Select
                value={form.paymentMode}
                onValueChange={(v) => setForm((f) => ({ ...f, paymentMode: v as TrialPaymentMode }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_no_card">Free (no card)</SelectItem>
                  <SelectItem value="stripe_trial">Stripe trial (card now)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-700">
            <div>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Enabled</p>
              <p className={sectionMutedClass}>
                {form.type === 'homepage'
                  ? 'Enabling this will disable any other live homepage campaign.'
                  : 'Redeemable immediately once enabled.'}
              </p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(checked) => setForm((f) => ({ ...f, enabled: checked }))} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || mutation.isPending}>
              Create campaign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CampaignDetailDialog({ campaignId, onOpenChange }: { campaignId: string | null; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { copiedKey, copy } = useCopyToClipboard();

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'trials', 'campaigns', campaignId],
    queryFn: () => ownerApi.getTrialCampaign(campaignId!),
    enabled: Boolean(campaignId),
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => ownerApi.updateTrialCampaign(campaignId!, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'trials', 'campaigns'] });
      toast.success('Campaign updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const campaign = data?.campaign;
  const getStartedUrl = campaign?.code
    ? `${window.location.origin}/get-started?code=${encodeURIComponent(campaign.code)}`
    : null;

  return (
    <Dialog open={Boolean(campaignId)} onOpenChange={onOpenChange}>
      <DialogContent>
        {isLoading || !campaign ? (
          <LoadingState />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{campaign.name}</DialogTitle>
              <DialogDescription>
                {campaign.type === 'code' ? 'Shared code campaign' : 'Homepage campaign'} ·{' '}
                {campaign.durationDays}-day trial · {PAYMENT_MODE_LABEL[campaign.paymentMode]}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-700">
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Enabled</p>
                  <p className={sectionMutedClass}>
                    {campaign.type === 'code'
                      ? `${campaign.redemptionCount}${campaign.maxRedemptions != null ? ` / ${campaign.maxRedemptions}` : ''} redeemed`
                      : `${campaign.redemptionCount} signups via homepage`}
                  </p>
                </div>
                <Switch
                  checked={campaign.enabled}
                  onCheckedChange={(checked) => toggleMutation.mutate(checked)}
                  disabled={toggleMutation.isPending}
                />
              </div>

              {campaign.code && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{campaign.code}</Badge>
                  <CopyButton
                    label="Copy code"
                    copied={copiedKey === 'code'}
                    onCopy={() => copy('code', campaign.code!)}
                  />
                  {getStartedUrl && (
                    <CopyButton
                      label="Copy signup link"
                      copied={copiedKey === 'url'}
                      onCopy={() => copy('url', getStartedUrl)}
                    />
                  )}
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium text-stone-900 dark:text-stone-100">Linked organizations</p>
                {data.redemptions.length === 0 ? (
                  <p className={sectionMutedClass}>No redemptions yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Redeemed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.redemptions.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.organizationName}</TableCell>
                          <TableCell className="text-stone-500">{formatDate(r.redeemedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CampaignsTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'trials', 'campaigns'],
    queryFn: ownerApi.listTrialCampaigns,
  });

  const campaigns = useMemo(
    () => [...(data?.campaigns ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [data],
  );

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New campaign
        </Button>
      </div>
      <Panel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Redemptions</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-stone-500">
                  No campaigns yet — create one to start offering timed trials.
                </TableCell>
              </TableRow>
            )}
            {campaigns.map((campaign: TrialCampaign) => (
              <TableRow
                key={campaign.id}
                className="cursor-pointer"
                onClick={() => setDetailCampaignId(campaign.id)}
              >
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell className="capitalize text-stone-500">{campaign.type}</TableCell>
                <TableCell className="text-stone-500">{campaign.code ?? '—'}</TableCell>
                <TableCell className="text-stone-500">{campaign.durationDays}d</TableCell>
                <TableCell className="text-stone-500">{PAYMENT_MODE_LABEL[campaign.paymentMode]}</TableCell>
                <TableCell className="text-stone-500">
                  {campaign.redemptionCount}
                  {campaign.maxRedemptions != null ? ` / ${campaign.maxRedemptions}` : ''}
                </TableCell>
                <TableCell>
                  <Badge variant={campaign.enabled ? 'success' : 'secondary'}>
                    {campaign.enabled ? 'Live' : 'Off'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <CreateCampaignDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CampaignDetailDialog campaignId={detailCampaignId} onOpenChange={(open) => !open && setDetailCampaignId(null)} />
    </div>
  );
}

function ReferralsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'trials', 'referrals'],
    queryFn: ownerApi.listReferrals,
  });

  if (isLoading) return <LoadingState />;

  const referrals = data?.referrals ?? [];

  return (
    <Panel>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead>Referral code</TableHead>
            <TableHead>Attributed signups</TableHead>
            <TableHead>Reward</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {referrals.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-stone-500">
                No organizations yet.
              </TableCell>
            </TableRow>
          )}
          {referrals.map((r) => (
            <TableRow key={r.organizationId}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="text-stone-500">{r.referralCode}</TableCell>
              <TableCell className="text-stone-500">{r.attributedSignupCount}</TableCell>
              <TableCell>
                <Badge variant="secondary">TBD</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}

function SettingsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'trials', 'settings'],
    queryFn: ownerApi.getTrialSettings,
  });

  const [durationDays, setDurationDays] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<TrialPaymentMode | null>(null);

  const settings = data?.settings;
  const effectiveDuration = durationDays ?? (settings ? String(settings.referralDurationDays) : '14');
  const effectivePaymentMode = paymentMode ?? settings?.referralPaymentMode ?? 'free_no_card';

  const mutation = useMutation({
    mutationFn: () =>
      ownerApi.updateTrialSettings({
        referralDurationDays: Number(effectiveDuration),
        referralPaymentMode: effectivePaymentMode,
      }),
    onSuccess: () => {
      toast.success('Referral settings saved');
      queryClient.invalidateQueries({ queryKey: ['owner', 'trials', 'settings'] });
      setDurationDays(null);
      setPaymentMode(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState />;

  return (
    <Panel className="max-w-lg p-6">
      <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Org referral defaults</h2>
      <p className={`${sectionMutedClass} mt-1`}>
        Applied when a new signup uses another organization&apos;s referral code instead of a campaign code.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <Label>Trial duration (days)</Label>
          <Input
            type="number"
            min={1}
            value={effectiveDuration}
            onChange={(e) => setDurationDays(e.target.value)}
          />
        </div>
        <div>
          <Label>Payment mode</Label>
          <Select value={effectivePaymentMode} onValueChange={(v) => setPaymentMode(v as TrialPaymentMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free_no_card">Free (no card)</SelectItem>
              <SelectItem value="stripe_trial">Stripe trial (card now)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Referral rewards</Label>
          <p className={sectionMutedClass}>TBD — no payout logic yet.</p>
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          Save settings
        </Button>
      </form>
    </Panel>
  );
}

export function TrialsCampaignsPage() {
  return (
    <div>
      <PageHeader
        title="Trials & Campaigns"
        description="Run timed free trials via shared codes and the homepage CTA, and track org-to-org referrals."
      />
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns">
          <CampaignsTab />
        </TabsContent>
        <TabsContent value="referrals">
          <ReferralsTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
