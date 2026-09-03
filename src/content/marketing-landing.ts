/**
 * Homepage + thin marketing pages. Copy stays inside shipped product behavior.
 * Do not invent prices, shop names, named owners, or SMS campaign claims.
 */

import { PLAN_TIERS, priceMonthlyDollars } from '@/lib/plan-features';
import { homepageTrialStartPath } from '@/lib/signup';

/** Live marketing + production homepage campaign duration. */
export const DEFAULT_TRIAL_DAYS = 14;

export type BeautyVertical = 'salon' | 'nail' | 'spa' | 'barber';

export const BEAUTY_VERTICALS: Array<{
  id: BeautyVertical;
  label: string;
  pitch: string;
}> = [
  {
    id: 'salon',
    label: 'Salon',
    pitch:
      'Hair salons use Viselle for color, cuts, and blowouts — one calendar and a booking page clients can open anytime.',
  },
  {
    id: 'nail',
    label: 'Nail',
    pitch:
      'Nail studios use Viselle for fills, sets, and pedicures — clients pick a chair time without a phone call.',
  },
  {
    id: 'spa',
    label: 'Spa',
    pitch:
      'Spas use Viselle for facials and treatments — rooms and therapists on one schedule, with a page clients can book from.',
  },
  {
    id: 'barber',
    label: 'Barber',
    pitch:
      'Barbershops use Viselle for cuts and standing appointments — share a booking link, then keep repeats on Professional or Business.',
  },
];

export const GET_STARTED_STEPS = [
  {
    n: '1',
    title: 'Name your salon and pick a booking URL',
    body: 'Get started asks for your business name and a slug. That becomes viselle.net/book/your-salon — included on every plan.',
  },
  {
    n: '2',
    title: 'Create your owner login and choose a plan',
    body: `Create the owner account, then pick Starter ($${priceMonthlyDollars(PLAN_TIERS[0])}), Professional ($${priceMonthlyDollars(PLAN_TIERS[1])}), or Business ($${priceMonthlyDollars(PLAN_TIERS[2])}). Website extras default to the free booking page.`,
  },
  {
    n: '3',
    title: 'Add a service, set hours, and turn booking on',
    body: 'Your dashboard checklist is the live path: add at least one service, set hours, and turn on the booking page. Then share the link.',
  },
] as const;

export const OWNER_STORY_CARDS = [
  {
    setting: 'A booth renter in Springfield',
    body: 'The phone rings while both hands are in the color bowl. You miss it, call back at the rinse, and they already booked somewhere else. A booking page that shows real openings means the next client picks a time while you are still at the bowl.',
  },
  {
    setting: 'A two-chair salon in Greene County',
    body: 'Two paper books on the desk, plus Instagram DMs that never make it into either one. Saturday gets double-booked; Tuesday sits empty. One shared calendar for both chairs — clients pick a time instead of sliding into the DMs.',
  },
  {
    setting: 'A nail studio that still books by phone',
    body: 'A walk-in found you on maps, then the phone on the counter with no book button. They left. A booking page plus an email before the visit means you are not chasing every fill the night before. Texts are a Professional and Business feature; outbound texts on viselle.net wait on carrier review.',
  },
] as const;

export {
  MARKETING_FAQ,
  marketingFaqEntities,
  type MarketingFaqItem,
} from '@/content/marketing-faq-items';

export type VersusSlug = 'glossgenius' | 'square';

export interface VersusPageContent {
  slug: VersusSlug;
  competitor: string;
  title: string;
  description: string;
  lede: string;
  chooseViselle: string[];
  chooseThem: string[];
  overlap: string[];
  notes: string[];
}

export const VERSUS_PAGES: Record<VersusSlug, VersusPageContent> = {
  glossgenius: {
    slug: 'glossgenius',
    competitor: 'GlossGenius',
    title: 'Viselle vs GlossGenius',
    description:
      'An honest look at Viselle and GlossGenius for salon, spa, and beauty-studio owners who need scheduling and online booking.',
    lede: 'Both products serve beauty businesses. GlossGenius is a broader beauty-business platform. Viselle is scheduling and online booking with a simple monthly plan.',
    chooseViselle: [
      'You want appointment scheduling and a booking page first, without buying a full payments-and-marketing suite.',
      'You want published monthly prices: Starter $20, Professional $49, Business $99 — every plan includes a free booking page.',
      'You want a 14-day trial on the live homepage offer, with no card required when that campaign is active.',
      'You already have a website and only need a booking API, or you are fine with viselle.net/book/your-salon.',
    ],
    chooseThem: [
      'You want an all-in-one beauty platform that also leans on in-person payments, client marketing, and a branded site as the core product.',
      'Your shop already runs on GlossGenius and switching cost is the real issue — stay until scheduling-only is clearly better for you.',
    ],
    overlap: [
      'Online booking so clients pick a time instead of calling.',
      'Calendars for beauty services, not generic office meetings.',
      'Reminders so fewer clients forget a color, facial, or cut.',
    ],
    notes: [
      'Viselle does not claim GlossGenius pricing, processing rates, or feature lists here — check their site for current terms.',
      'Viselle text reminders are on Professional and Business only, and outbound texts on viselle.net wait on carrier review. Email reminders send on every plan.',
      'Viselle hosted subdomains and custom websites are optional add-ons with pricing TBD, not a bundled website builder.',
    ],
  },
  square: {
    slug: 'square',
    competitor: 'Square',
    title: 'Viselle vs Square Appointments',
    description:
      'An honest look at Viselle and Square Appointments for salon and spa owners comparing beauty-first scheduling with a general payments platform.',
    lede: 'Square is a payments and point-of-sale company that also sells appointments. Viselle is scheduling software built for salons, spas, and beauty studios.',
    chooseViselle: [
      'You want a beauty-first calendar and booking page, not a general POS that happens to take appointments.',
      'You want a simple published plan (Starter $20 / Professional $49 / Business $99) instead of assembling Square hardware, appointments, and add-ons.',
      'You need a public booking API or a viselle.net/book link you can share today after you add a service, hours, and turn booking on.',
      'You are a booth renter or small team and do not need Square’s full retail stack.',
    ],
    chooseThem: [
      'You already take cards on Square and want appointments tied to that same payments account and hardware.',
      'You run retail plus services and need a general POS more than a salon-first scheduler.',
    ],
    overlap: [
      'Clients can book a time online instead of calling the desk.',
      'Staff or chair calendars, depending on how you set the shop up.',
      'Reminders exist in both products — on Viselle, email is live on every plan.',
    ],
    notes: [
      'This page does not invent Square’s current appointment prices or processing fees. Check Square for those.',
      'Viselle is not a card-present POS and does not replace Square hardware.',
      'Viselle outbound SMS is not a live production campaign tool; email reminders are the honest no-show path today.',
    ],
  },
};

export const VERSUS_SLUGS = Object.keys(VERSUS_PAGES) as VersusSlug[];

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  path: string;
  dateLabel: string;
}

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: 'viselle-vs-glossgenius',
    title: 'Viselle vs GlossGenius',
    description: VERSUS_PAGES.glossgenius.description,
    path: '/versus/glossgenius',
    dateLabel: 'September 2026',
  },
  {
    slug: 'viselle-vs-square',
    title: 'Viselle vs Square Appointments',
    description: VERSUS_PAGES.square.description,
    path: '/versus/square',
    dateLabel: 'September 2026',
  },
];

export const trialStartPath = homepageTrialStartPath();
