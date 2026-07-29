import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ownerApi } from '@/lib/api';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().email('Enter a valid owner email'),
});

type FormData = z.infer<typeof schema>;

interface PlatformOrgOwnerSectionProps {
  orgId: string;
}

/** Platform-only: invite an org owner when the org has none, or show current owner. */
export function PlatformOrgOwnerSection({ orgId }: PlatformOrgOwnerSectionProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['organization', orgId, 'platform_owner'],
    queryFn: () => ownerApi.getOrganization(orgId),
    enabled: !!orgId,
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => ownerApi.inviteOrgOwner(orgId, { email }),
    onSuccess: (result) => {
      toast.success(`Set-password email sent to ${result.owner.email}`);
      reset({ email: '' });
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'organizations'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState />;

  const owner = data?.owner ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Org owner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {owner ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium text-stone-900 dark:text-stone-100">{owner.email}</p>
            <p className="text-stone-500 dark:text-stone-400">
              {owner.setupPending
                ? 'Invite sent — waiting for password setup. You can still use Log in as owner.'
                : 'Owner account is active. Use Log in as owner from the organizations list.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              This organization has no owner account yet. Invite an owner to enable Log in as owner
              and give them access to the salon dashboard.
            </p>
            <form
              onSubmit={handleSubmit((d) => inviteMutation.mutate(d.email.trim()))}
              className="space-y-3"
            >
              <div>
                <Label htmlFor="invite-owner-email">Owner email</Label>
                <Input
                  id="invite-owner-email"
                  type="email"
                  autoComplete="off"
                  placeholder="owner@salon.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  We&apos;ll email a link to set their password. Need another login in the same inbox?
                  Use a plus tag like you+salon@gmail.com.
                </p>
              </div>
              <Button type="submit" size="sm" disabled={inviteMutation.isPending}>
                <Mail className="h-4 w-4" />
                {inviteMutation.isPending ? 'Sending…' : 'Invite owner'}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
