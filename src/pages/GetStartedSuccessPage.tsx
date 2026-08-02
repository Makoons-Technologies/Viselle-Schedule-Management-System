import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { marketingSeo } from '@/content/marketing-seo';
import { MARKETING_SHELL_CLASS } from '@/lib/marketing-theme';
import { getSignupSessionStatus } from '@/lib/signup';

const SHOP_LOADING_LINES = [
  'Warming up the towel warmer…',
  'Alphabetizing the product shelf…',
  'Untangling the cape strings…',
  'Polishing the mirrors (again)…',
  'Restocking the cotton balls…',
  'Finding a parking spot for your first client…',
  'Tuning the appointment bells…',
  'Folding the last clean towel…',
  'Charging the clippers…',
  'Putting the “open” sign on straight…',
];

export function GetStartedSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'completed' | 'pending' | 'failed' | 'missing'>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setStatus('missing');
      return;
    }

    let attempts = 0;
    let cancelled = false;

    async function poll() {
      try {
        const result = await getSignupSessionStatus(sessionId!);
        if (cancelled) return;

        setEmail(result.ownerEmail);

        if (result.status === 'completed') {
          setStatus('completed');
          return;
        }

        if (result.status === 'failed') {
          setStatus('failed');
          return;
        }

        // Keep polling while Stripe webhook / reconcile finishes provisioning.
        setStatus(attempts >= 8 ? 'pending' : 'loading');
        attempts += 1;
        window.setTimeout(() => void poll(), attempts < 30 ? 2000 : 5000);
      } catch {
        if (!cancelled) setStatus('failed');
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (status !== 'loading' && status !== 'pending') return;
    const id = window.setInterval(() => {
      setLineIndex((i) => (i + 1) % SHOP_LOADING_LINES.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status !== 'completed') return;
    const id = window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1400);
    return () => window.clearTimeout(id);
  }, [status, navigate]);

  const isBusy = status === 'loading' || status === 'pending';

  return (
    <div className={MARKETING_SHELL_CLASS}>
      <PageSeo {...marketingSeo.getStartedSuccess} />
      <MarketingHeader />

      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <Card className="border-white/15 bg-white/95 shadow-2xl">
          <CardHeader className="text-center">
            {isBusy ? (
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-600" />
            ) : status === 'completed' ? (
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400" />
            ) : null}
            <CardTitle className="mt-4">
              {status === 'completed'
                ? 'Welcome to Viselle!'
                : status === 'pending'
                  ? 'Payment received — setting up your account'
                  : status === 'failed'
                    ? 'Something went wrong'
                    : status === 'missing'
                      ? 'Missing checkout session'
                      : 'Finishing setup…'}
            </CardTitle>
            <CardDescription>
              {status === 'completed' &&
                (email
                  ? `All set — taking you to sign in as ${email}…`
                  : 'All set — taking you to sign in…')}
              {isBusy && SHOP_LOADING_LINES[lineIndex]}
              {status === 'failed' &&
                'We could not finish provisioning your account. Please contact support with your receipt.'}
              {status === 'missing' && 'Return to signup and try checkout again.'}
            </CardDescription>
          </CardHeader>
          {!isBusy && status !== 'completed' && (
            <CardContent className="flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link to="/login">Go to sign in</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/get-started">Back to signup</Link>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>

      <MarketingFooter />
    </div>
  );
}
