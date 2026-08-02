import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Gift, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { orgApi } from '@/lib/api';
import { absoluteUrl } from '@/lib/seo';
import { getStartedPath } from '@/lib/signup';
import { cn } from '@/lib/utils';

function useReferralOrg() {
  const { user } = useAuth();
  const { effectiveOrgId, selectedOrg } = useOrg();
  const orgId = effectiveOrgId ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => orgApi.getOrganization(orgId),
    enabled: !!orgId && !!user && user.role !== 'platform_owner',
  });

  const referralCode =
    (user?.role === 'platform_owner' ? selectedOrg?.referralCode : data?.organization.referralCode) ??
    null;

  const visible =
    !!user &&
    !!orgId &&
    (user.role === 'platform_owner' ? !!selectedOrg && !!referralCode : isLoading || !!referralCode);

  return { visible, referralCode, isLoading: user?.role === 'platform_owner' ? false : isLoading };
}

interface ReferAFriendTriggerProps {
  mobile?: boolean;
  onClick: () => void;
  className?: string;
}

/** Nav-row trigger. Keep the dialog mounted outside Sheet so closing the drawer doesn't unmount it. */
export function ReferAFriendTrigger({ mobile, onClick, className }: ReferAFriendTriggerProps) {
  const { visible, referralCode } = useReferralOrg();
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!referralCode}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border border-transparent px-3 font-medium text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-100',
        mobile ? 'min-h-11 py-2.5 text-[0.9375rem]' : 'py-2 text-sm',
        !referralCode && 'opacity-60',
        className,
      )}
    >
      <Gift className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
      Refer a friend
    </button>
  );
}

interface ReferAFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReferAFriendDialog({ open, onOpenChange }: ReferAFriendDialogProps) {
  const { referralCode } = useReferralOrg();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const sharePath = referralCode ? getStartedPath({ code: referralCode }) : '';
  const shareUrl = referralCode ? absoluteUrl(sharePath) : '';

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success('Copied to clipboard');
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const share = async () => {
    if (!referralCode || !shareUrl) return;
    const message = `Join me on Viselle with my referral code ${referralCode}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Viselle', text: message, url: shareUrl });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
    await copy('link', shareUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refer a friend</DialogTitle>
          <DialogDescription>
            Share your referral code so another salon or spa can start a Viselle trial. Your code stays
            the same for your business.
          </DialogDescription>
        </DialogHeader>

        {referralCode ? (
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Your code
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 font-mono text-sm tracking-wide text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100">
                  {referralCode}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copy referral code"
                  onClick={() => copy('code', referralCode)}
                >
                  {copiedKey === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Invite link
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 font-mono text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300">
                  {shareUrl}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copy invite link"
                  onClick={() => copy('link', shareUrl)}
                >
                  {copiedKey === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="button" className="w-full" onClick={share}>
              <Share2 className="h-4 w-4" />
              Share invite
            </Button>
          </div>
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">Loading your referral code…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Desktop sidebar: trigger + dialog in one place (aside does not unmount). */
export function ReferAFriendPanel({ mobile }: { mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const { visible } = useReferralOrg();
  if (!visible) return null;

  return (
    <>
      <ReferAFriendTrigger mobile={mobile} onClick={() => setOpen(true)} />
      <ReferAFriendDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
