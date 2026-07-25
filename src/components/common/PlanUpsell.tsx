import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { contactPath } from '@/lib/contact';
import { useOrgId } from '@/hooks/useOrgId';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PlanUpsellProps {
  title: string;
  description: string;
  featureLabel?: string;
}

export function PlanUpsell({ title, description, featureLabel }: PlanUpsellProps) {
  const orgId = useOrgId();

  return (
    <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-white dark:border-brand-900 dark:from-brand-950/40 dark:to-stone-900">
      <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 max-w-xl text-sm text-stone-600 dark:text-stone-400">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={`/orgs/${orgId}/settings/plan`}>Upgrade plan</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={contactPath({ interest: 'upgrade' })}>Contact us</Link>
          </Button>
        </div>
      </CardContent>
      {featureLabel && (
        <p className="border-t border-brand-100 px-6 py-2 text-xs text-stone-500 dark:border-brand-900 dark:text-stone-400">
          Interested in: {featureLabel}
        </p>
      )}
    </Card>
  );
}
