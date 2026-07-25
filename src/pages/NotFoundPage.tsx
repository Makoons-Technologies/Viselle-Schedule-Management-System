import { Link } from 'react-router-dom';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { marketingSeo } from '@/content/marketing-seo';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 via-white to-stone-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <PageSeo {...marketingSeo.notFound} />
      <MarketingHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <p className="text-sm font-medium tracking-wide text-brand-700 dark:text-brand-300">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-md text-stone-600 dark:text-stone-300">
          That link doesn&apos;t go anywhere. Head home or sign in to your account.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
