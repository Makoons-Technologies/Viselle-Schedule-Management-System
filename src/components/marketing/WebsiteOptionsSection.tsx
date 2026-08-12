import { Globe, LayoutTemplate, Link2, Paintbrush, Plug } from 'lucide-react';
import { Link } from 'react-router-dom';
import { contactPath } from '@/lib/contact';
import { getStartedPath } from '@/lib/signup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const WEBSITE_OPTIONS = [
  {
    icon: Link2,
    badge: 'Included with every plan',
    title: 'Free booking link',
    description:
      'Share a simple link like viselle.net/book/your-salon. Clients pick a service, choose a time, and book — no extra cost.',
    bullets: ['Works on any plan', 'Classic, Modern, or Minimal style', 'Ready when you turn on online booking'],
    cta: { label: 'Get started', to: getStartedPath() },
    variant: 'included' as const,
  },
  {
    icon: LayoutTemplate,
    badge: 'Optional add-on',
    title: 'Hosted subdomain',
    description:
      'Your own address like yourspa.sites.viselle.net — the same booking page as your included link, on a branded subdomain.',
    bullets: ['Branded subdomain URL', 'Same templates & branding as your booking page', '$19/mo — add at checkout'],
    cta: { label: 'Add at signup', to: getStartedPath({ subdomain: true }) },
    variant: 'addon' as const,
  },
  {
    icon: Paintbrush,
    badge: 'We build it for you',
    title: 'Custom website',
    description:
      'Our team designs and launches a full branded site for your salon — photography, copy, and online booking built in. Until then, your free booking page keeps working.',
    bullets: [
      'Professional design & launch',
      'Free booking page while we build',
      'Pricing to be determined — we reach out after signup',
    ],
    cta: { label: 'Request at signup', to: getStartedPath({ customWebsite: true }) },
    variant: 'build' as const,
  },
  {
    icon: Plug,
    badge: 'For existing websites',
    title: 'Your site + our API',
    description:
      'Already have a website on your own domain? Embed Viselle booking with a secure API. We help with setup.',
    bullets: ['Keep your current domain', 'API key & domain whitelist', 'Ideal for franchises & med spas'],
    cta: { label: 'Contact for API details', to: contactPath({ interest: 'api' }) },
    variant: 'api' as const,
  },
];

const glassCardClass =
  'border-white/15 bg-white/10 text-white shadow-none backdrop-blur-sm ring-0';

export function WebsiteOptionsSection() {
  return (
    <section id="websites" className="scroll-mt-20 border-y border-white/10 bg-black/15 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white/90 backdrop-blur-sm">
            <Globe className="h-4 w-4 text-[#fdeb83]" />
            Online booking for clients
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            A booking page comes with your plan
          </h2>
          <p className="mt-4 text-lg text-white/70">
            You don&apos;t need a separate website product to start taking appointments online. Every plan
            includes a shareable booking page. Add a hosted subdomain, have us build a custom site, or connect
            your existing website later.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {WEBSITE_OPTIONS.map((option) => (
            <Card
              key={option.title}
              className={glassCardClass}
            >
              <CardHeader className="space-y-3">
                <span
                  className={
                    option.variant === 'included'
                      ? 'inline-flex w-fit rounded-full border border-emerald-300/30 bg-emerald-400/15 px-2.5 py-0.5 text-xs font-medium text-emerald-200'
                      : option.variant === 'addon' || option.variant === 'build'
                        ? 'inline-flex w-fit rounded-full border border-brand-300/30 bg-brand-400/15 px-2.5 py-0.5 text-xs font-medium text-brand-200'
                        : 'inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80'
                  }
                >
                  {option.badge}
                </span>
                <div className="flex items-center gap-2">
                  <option.icon className="h-5 w-5 text-[#fdeb83]" />
                  <CardTitle className="text-lg text-white">{option.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-white/70">{option.description}</p>
                <ul className="space-y-2 text-sm text-white/80">
                  {option.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="text-[#fdeb83]">·</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={cn(
                    'w-full',
                    option.variant !== 'included' &&
                      option.variant !== 'build' &&
                      'border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white',
                  )}
                  variant={option.variant === 'included' || option.variant === 'build' ? 'default' : 'outline'}
                >
                  <Link to={option.cta.to}>{option.cta.label}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
