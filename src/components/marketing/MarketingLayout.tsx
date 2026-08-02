import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PoweredByMakoons } from '@/components/common/PoweredByMakoons';
import { ViselleLogo } from '@/components/common/ViselleLogo';
import { cn } from '@/lib/utils';

const navLinkClassName =
  'text-sm font-medium text-white/75 transition-colors hover:text-white';

export function MarketingHeader() {
  return (
    <header className="border-b border-white/10 bg-[#0f172a]/45 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <ViselleLogo size={36} />
          <span className="text-xl font-semibold text-white">Viselle</span>
        </Link>
        <nav className="flex items-center gap-5 sm:gap-6">
          <div className="flex items-center gap-5 sm:gap-6">
            <a href="/#websites" className={cn(navLinkClassName, 'hidden sm:inline')}>
              Booking pages
            </a>
            <a href="/#pricing" className={cn(navLinkClassName, 'hidden sm:inline')}>
              Pricing
            </a>
            <Link to="/contact" className={navLinkClassName}>
              Contact
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link to="/get-started">Get started</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            >
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0f172a]/70 py-10 text-white/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-3">
          <ViselleLogo size={28} />
          <p className="text-sm">© {new Date().getFullYear()} Viselle. Built for beauty businesses.</p>
        </div>
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
          <a href="/llms.txt" className="text-brand-300 hover:text-brand-200">
            llms.txt
          </a>
        </p>
      </div>
      <div className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
        <PoweredByMakoons className="text-white/35" />
      </div>
    </footer>
  );
}
