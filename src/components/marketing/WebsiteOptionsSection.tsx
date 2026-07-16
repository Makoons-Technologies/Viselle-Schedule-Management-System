import { Globe, LayoutTemplate, Link2, Paintbrush, Plug } from 'lucide-react';
import { Link } from 'react-router-dom';
import { contactPath } from '@/lib/contact';
import { getStartedPath } from '@/lib/signup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const WEBSITE_OPTIONS = [
  {
    icon: Link2,
    badge: 'Included with every plan',
    title: 'Free booking link',
    description:
      'Share a simple link like viselle.app/book/your-salon. Clients pick a service, choose a time, and book — no extra cost.',
    bullets: ['Works on any plan', 'Classic, Modern, or Minimal style', 'Ready when you turn on online booking'],
    cta: { label: 'Get started', to: getStartedPath() },
    variant: 'included' as const,
  },
  {
    icon: LayoutTemplate,
    badge: 'Optional add-on',
    title: 'Hosted subdomain',
    description:
      'Your own address like yourspa.viselle.app — the same booking page as your included link, on a branded subdomain.',
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

export function WebsiteOptionsSection() {
  return (
    <section id="websites" className="scroll-mt-20 border-y border-stone-200 bg-stone-50 py-16 dark:border-stone-800 dark:bg-stone-900 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-700 shadow-sm dark:bg-stone-800 dark:text-brand-200">
            <Globe className="h-4 w-4" />
            Online booking for clients
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
            A booking page comes with your plan
          </h2>
          <p className="mt-4 text-lg text-stone-600 dark:text-stone-300">
            You don&apos;t need a separate website product to start taking appointments online. Every plan
            includes a shareable booking page. Add a hosted subdomain, have us build a custom site, or connect
            your existing website later.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {WEBSITE_OPTIONS.map((option) => (
            <Card
              key={option.title}
              className={
                option.variant === 'addon' || option.variant === 'build'
                  ? 'border-brand-300 bg-white shadow-sm ring-1 ring-brand-100 dark:border-brand-700 dark:bg-stone-900 dark:ring-brand-900'
                  : 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900'
              }
            >
              <CardHeader className="space-y-3">
                <span
                  className={
                    option.variant === 'included'
                      ? 'inline-flex w-fit rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                      : option.variant === 'addon' || option.variant === 'build'
                        ? 'inline-flex w-fit rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/50 dark:text-brand-200'
                        : 'inline-flex w-fit rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-700 dark:text-stone-200'
                  }
                >
                  {option.badge}
                </span>
                <div className="flex items-center gap-2">
                  <option.icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{option.description}</p>
                <ul className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  {option.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="text-brand-600 dark:text-brand-400">·</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="w-full"
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
