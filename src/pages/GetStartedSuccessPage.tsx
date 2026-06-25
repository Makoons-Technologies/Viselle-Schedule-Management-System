import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSignupSessionStatus } from '@/lib/signup';

export function GetStartedSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'completed' | 'pending' | 'failed' | 'missing'>('loading');
  const [email, setEmail] = useState<string | null>(null);

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

        attempts += 1;
        if (attempts < 15) {
          window.setTimeout(() => void poll(), 2000);
        } else {
          setStatus('pending');
        }
      } catch {
        if (!cancelled) setStatus('failed');
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-stone-50">
      <MarketingHeader />

      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <Card className="border-stone-200">
          <CardHeader className="text-center">
            {status === 'loading' || status === 'pending' ? (
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-600" />
            ) : status === 'completed' ? (
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
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
                'Your salon account is ready. Sign in with the email you used at checkout.'}
              {status === 'pending' &&
                'This usually takes a few seconds. You can sign in shortly — we will keep checking.'}
              {status === 'loading' && 'Confirming your payment and creating your workspace…'}
              {status === 'failed' &&
                'We could not finish provisioning your account. Please contact support with your receipt.'}
              {status === 'missing' && 'Return to signup and try checkout again.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {email && status === 'completed' && (
              <p className="text-center text-sm text-stone-600">
                Sign in as <span className="font-medium text-stone-900">{email}</span>
              </p>
            )}
            <Button asChild className="w-full">
              <Link to="/login">{status === 'completed' ? 'Sign in to your dashboard' : 'Go to sign in'}</Link>
            </Button>
            {status !== 'completed' && (
              <Button asChild variant="outline" className="w-full">
                <Link to="/get-started">Back to signup</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <MarketingFooter />
    </div>
  );
}
