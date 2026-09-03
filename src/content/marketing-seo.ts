import {
  buildIndustryFaqPage,
  industryStats,
  softwareApplicationIndustryProperties,
} from '@/lib/industry-stats';
import { VISELLE_SOCIAL_SAME_AS } from '@/content/social';
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
  sameAs: [...VISELLE_SOCIAL_SAME_AS],
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
  sameAs: [...VISELLE_SOCIAL_SAME_AS],
  offers: {
    '@type': 'Offer',
    url: absoluteUrl('/pricing'),
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  ...softwareApplicationIndustryProperties(industryStats),
};

const industryFaqJsonLd = {
  '@context': 'https://schema.org',
  ...buildIndustryFaqPage(industryStats),
};

export const marketingSeo = {
  home: {
    title: 'Viselle',
    description:
      'Viselle helps beauty and wellness businesses manage appointments, staff schedules, and client reminders — with an online booking page clients can use anytime.',
    path: '/',
    image: defaultOgImage,
    jsonLd: [organizationJsonLd, softwareJsonLd, industryFaqJsonLd],
  },
  pricing: {
    title: 'Plans & pricing',
    description:
      'See Viselle plans for salons, spas, and beauty studios. Online booking, staff scheduling, and reminders — choose the tier that fits your business.',
    path: '/#pricing',
    image: defaultOgImage,
  },
  pricingPage: {
    title: 'Plans & pricing',
    description:
      'Viselle plans: Starter $20, Professional $49, Business $99 per month. Every plan includes scheduling and a free online booking page. 14-day free trial.',
    path: '/pricing',
    image: defaultOgImage,
    jsonLd: [organizationJsonLd, softwareJsonLd],
  },
  docs: {
    title: 'Docs',
    description:
      'Viselle public docs — booking API, llms.txt, and release notes for salon scheduling and online booking.',
    path: '/docs',
    image: defaultOgImage,
  },
  blog: {
    title: 'Resources',
    description:
      'Viselle resources for salon owners — honest comparisons with GlossGenius and Square, plus links to pricing and docs.',
    path: '/blog',
    image: defaultOgImage,
  },
  versusGlossgenius: {
    title: 'Viselle vs GlossGenius',
    description:
      'An honest look at Viselle and GlossGenius for salon, spa, and beauty-studio owners who need scheduling and online booking.',
    path: '/versus/glossgenius',
    image: defaultOgImage,
  },
  versusSquare: {
    title: 'Viselle vs Square Appointments',
    description:
      'An honest look at Viselle and Square Appointments for salon and spa owners comparing beauty-first scheduling with a general payments platform.',
    path: '/versus/square',
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
  privacy: {
    title: 'Privacy Policy',
    description:
      'How Viselle and Makoons Technologies collect, use, and share information for salon scheduling, online booking, and appointment SMS reminders.',
    path: '/privacy',
    image: defaultOgImage,
  },
  terms: {
    title: 'Terms & Conditions',
    description:
      'Terms for using Viselle scheduling software, public booking pages, and appointment reminder texts, including SMS opt-in, HELP, and STOP.',
    path: '/terms',
    image: defaultOgImage,
  },
  requestDemo: {
    title: 'Request a demo',
    description:
      'Book a 30-minute Viselle demo. Pick a time that works and we will walk you through scheduling, booking pages, and reminders for your salon or spa.',
    path: '/request-demo',
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
  businessCard: {
    title: 'Digital business card',
    description:
      'Exclusive Viselle beta access — scan or visit viselle.net/get-started with your campaign access code.',
    path: '/business-card',
    image: defaultOgImage,
  },
  social: {
    title: 'Share Viselle',
    description:
      'Full-screen Viselle beta share image — story or square — with campaign code, QR, and get-started link.',
    path: '/social',
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
