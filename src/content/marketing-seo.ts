import { absoluteUrl, SITE_NAME, SITE_ORIGIN } from '@/lib/seo';

export interface MarketingSeoConfig {
  title: string;
  description: string;
  path: string;
  robots?: string;
  image?: string | null;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const defaultOgImage = '/viselle-logo.png';

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_ORIGIN,
  logo: absoluteUrl(defaultOgImage),
  description:
    'Viselle is scheduling software for salons, spas, and beauty studios — online booking, staff schedules, and client reminders.',
  email: 'hello@viselle.net',
};

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE_ORIGIN,
  description:
    'Appointment scheduling and online booking for beauty and wellness businesses. Manage staff, services, reminders, and a public booking page.',
  offers: {
    '@type': 'Offer',
    url: absoluteUrl('/#pricing'),
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
};

export const marketingSeo = {
  home: {
    title: 'Viselle',
    description:
      'Viselle helps beauty and wellness businesses manage appointments, staff schedules, and client reminders — with an online booking page clients can use anytime.',
    path: '/',
    image: defaultOgImage,
    jsonLd: [organizationJsonLd, softwareJsonLd],
  },
  pricing: {
    title: 'Plans & pricing',
    description:
      'See Viselle plans for salons, spas, and beauty studios. Online booking, staff scheduling, and reminders — choose the tier that fits your business.',
    path: '/#pricing',
    image: defaultOgImage,
  },
  websites: {
    title: 'Booking pages & websites',
    description:
      'Give clients a branded online booking page. Viselle supports path links, hosted subdomains, and custom website options for beauty businesses.',
    path: '/#websites',
    image: defaultOgImage,
  },
  contact: {
    title: 'Contact',
    description:
      'Contact Viselle about scheduling software for your salon, spa, or beauty studio. Ask about plans, trials, hosted booking pages, or custom websites.',
    path: '/contact',
    image: defaultOgImage,
  },
  getStarted: {
    title: 'Get started',
    description:
      'Start Viselle for your salon, spa, or beauty studio. Choose a plan, set up online booking, and manage appointments and staff schedules.',
    path: '/get-started',
    image: defaultOgImage,
  },
  getStartedSuccess: {
    title: 'Welcome to Viselle',
    description: 'Your Viselle signup is being finalized. Sign in when your account is ready.',
    path: '/get-started/success',
    robots: 'noindex,nofollow',
  },
  docsApi: {
    title: 'Public booking API docs',
    description:
      'Developer documentation for the Viselle public booking API — look up organizations, services, availability, and create appointments without authentication.',
    path: '/docs/api',
    image: defaultOgImage,
  },
  releases: {
    title: 'Release notes',
    description:
      'What is new in Viselle — product updates for salon scheduling, online booking, reminders, and related features.',
    path: '/releases',
    image: defaultOgImage,
  },
  login: {
    title: 'Sign in',
    description: 'Sign in to your Viselle account to manage appointments, staff, and booking settings.',
    path: '/login',
    robots: 'noindex,follow',
  },
  forgotPassword: {
    title: 'Forgot password',
    description: 'Reset your Viselle account password.',
    path: '/forgot-password',
    robots: 'noindex,nofollow',
  },
  setPassword: {
    title: 'Set password',
    description: 'Set a password for your Viselle account.',
    path: '/set-password',
    robots: 'noindex,nofollow',
  },
  notFound: {
    title: 'Page not found',
    description: 'This page could not be found on Viselle.',
    path: '/404',
    robots: 'noindex,follow',
  },
} satisfies Record<string, MarketingSeoConfig>;
