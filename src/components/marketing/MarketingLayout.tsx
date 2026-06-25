import { Link } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MarketingHeader() {
  return (
    <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Scissors className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold text-brand-800">Viselle</span>
        </Link>
        <nav className="flex items-center gap-3">
          <a
            href="/#websites"
            className="hidden text-sm font-medium text-stone-600 hover:text-brand-700 sm:inline"
          >
            Booking pages
          </a>
          <a
            href="/#pricing"
            className="hidden text-sm font-medium text-stone-600 hover:text-brand-700 sm:inline"
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
        <p className="text-sm">
          <Link to="/contact" className="text-brand-300 hover:text-brand-200">
            Contact us
          </Link>
        </p>
      </div>
    </footer>
  );
}
