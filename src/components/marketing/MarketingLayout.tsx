import { Link } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PoweredByMakoons } from '@/components/common/PoweredByMakoons';

export function MarketingHeader() {
  return (
    <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Scissors className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold text-brand-700 dark:text-stone-100">Viselle</span>
        </Link>
        <nav className="flex items-center gap-3">
          <a
            href="/#websites"
            className="hidden text-sm font-medium text-stone-600 hover:text-brand-700 dark:text-stone-300 dark:hover:text-brand-300 sm:inline"
          >
            Booking pages
          </a>
          <a
            href="/#pricing"
            className="hidden text-sm font-medium text-stone-600 hover:text-brand-700 dark:text-stone-300 dark:hover:text-brand-300 sm:inline"
          >
            Pricing
          </a>
          <Button asChild variant="ghost" size="sm">
            <Link to="/contact">Contact</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/get-started">Get started</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-stone-200 bg-stone-900 py-10 text-stone-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <p className="text-sm">© {new Date().getFullYear()} Viselle. Built for beauty businesses.</p>
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          <Link to="/docs/api" className="text-brand-300 hover:text-brand-200">
            API docs
          </Link>
          <Link to="/releases" className="text-brand-300 hover:text-brand-200">
            Release notes
          </Link>
          <Link to="/contact" className="text-brand-300 hover:text-brand-200">
            Contact us
          </Link>
        </p>
      </div>
      <div className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
        <PoweredByMakoons className="text-stone-600" />
      </div>
    </footer>
  );
}
