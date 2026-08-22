export type OrgOwnerTourTarget =
  | 'dashboard'
  | 'calendar'
  | 'appointments'
  | 'customers'
  | 'recurring'
  | 'settings';

export interface OrgOwnerTourStep {
  id: string;
  title: string;
  body: string[];
  path: (orgId: string) => string;
  target: OrgOwnerTourTarget;
}

export const ORG_OWNER_TOUR_STEPS: OrgOwnerTourStep[] = [
  {
    id: 'welcome',
    title: 'Your shop, in one place',
    body: [
      'This walkthrough is for owners. Skip anytime — the checklist on your dashboard is what “live” means: hours, at least one service, and a booking page you can share.',
      'Staff will not see this tour. You can replay it from the dashboard.',
    ],
    path: (orgId) => `/orgs/${orgId}/dashboard`,
    target: 'dashboard',
  },
  {
    id: 'calendar',
    title: 'Scheduling',
    body: [
      'The calendar is the book: who is on the chair, when, and with whom. Tap a slot to add a visit, or open an existing one to move or cancel it.',
      'This is the view most owners live in during the day.',
    ],
    path: (orgId) => `/orgs/${orgId}/calendar`,
    target: 'calendar',
  },
  {
    id: 'appointments',
    title: 'Appointments',
    body: [
      'Appointments is the list — statuses, no-shows, and notes — when you need the book as a queue instead of a grid.',
      'Notes you write here stay with the customer and the service, so you can see them again next visit.',
    ],
    path: (orgId) => `/orgs/${orgId}/appointments`,
    target: 'appointments',
  },
  {
    id: 'recurring',
    title: 'Recurring visits',
    body: [
      'Standing appointments (every other Tuesday color, weekly cut, and so on) live here.',
      'Start from a real visit so the pattern stays tied to a person, a service, and a time — not a blank template.',
    ],
    path: (orgId) => `/orgs/${orgId}/recurring`,
    target: 'recurring',
  },
  {
    id: 'customers',
    title: 'Customers',
    body: [
      'Everyone who has booked shows up here. Open a person to fix name, email, or phone if it was entered wrong.',
      'On their page you can also read every note, grouped by the service it was written for.',
    ],
    path: (orgId) => `/orgs/${orgId}/customers`,
    target: 'customers',
  },
  {
    id: 'services',
    title: 'Services',
    body: [
      'Services are what people book — name, duration, price. You need at least one before the public page can offer a slot.',
      'Add the work you actually sell. You can change prices later without retraining anyone.',
    ],
    path: (orgId) => `/orgs/${orgId}/settings/services`,
    target: 'settings',
  },
  {
    id: 'products',
    title: 'Products',
    body: [
      'Retail on the desk — shampoo, merch, add-ons. Optional. Track what you sell so tickets and stock stay together.',
      'Skip this if you do not sell products yet.',
    ],
    path: (orgId) => `/orgs/${orgId}/settings/products`,
    target: 'settings',
  },
  {
    id: 'staff',
    title: 'Staff',
    body: [
      'Add the people who take appointments. If it is just you, you are already here — invite others when you are ready.',
      'Each person can have their own hours. Permissions live under Settings if you want tighter control.',
    ],
    path: (orgId) => `/orgs/${orgId}/staff`,
    target: 'settings',
  },
  {
    id: 'availability',
    title: 'Hours',
    body: [
      'Availability is when you are willing to take bookings. No hours means an empty public book.',
      'Set this for yourself (and each staff member) before you share a link. It is part of going live.',
    ],
    path: (orgId) => `/orgs/${orgId}/availability`,
    target: 'settings',
  },
  {
    id: 'website',
    title: 'Website and booking',
    body: [
      'Included with your plan: a booking page at viselle.net/book/your-shop, and the API if you already have a site. Wire booking into that site so clients never leave it — no extra API fee. We only cap abusive traffic.',
      'Paid add-on: a subdomain like yourshop.viselle.net (your org name as the URL). It can be the booking page with a nicer address, or a custom site we host. Each name is unique. Ask us to turn it on.',
    ],
    path: (orgId) => `/orgs/${orgId}/website`,
    target: 'settings',
  },
  {
    id: 'payments',
    title: 'Payments (optional)',
    body: [
      'Card payments live in Settings → Payments. You can take cash, Venmo, or pay-in-person without this.',
      'Not required to go live. Set it up when you want Viselle to collect cards.',
    ],
    path: (orgId) => `/orgs/${orgId}/settings/payments`,
    target: 'settings',
  },
  {
    id: 'done',
    title: 'You are set',
    body: [
      'Finish the checklist on the dashboard, then share the booking link. Replay this tour anytime from there.',
      'If you get stuck, ping us — we do not chase self-serve setups unless you ask.',
    ],
    path: (orgId) => `/orgs/${orgId}/dashboard`,
    target: 'dashboard',
  },
];

const STORAGE_PREFIX = 'viselle.org-owner-tour.v2:';
const LEGACY_STORAGE_PREFIX = 'viselle.org-owner-tour.v1:';

export type OrgOwnerTourStorage = 'done' | 'skipped';

export function orgOwnerTourStorageKey(userId: string, orgId: string): string {
  return `${STORAGE_PREFIX}${userId}:${orgId}`;
}

function legacyOrgOwnerTourStorageKey(orgId: string): string {
  return `${LEGACY_STORAGE_PREFIX}${orgId}`;
}

export function readOrgOwnerTourStorage(userId: string, orgId: string): OrgOwnerTourStorage | null {
  try {
    const key = orgOwnerTourStorageKey(userId, orgId);
    const raw = localStorage.getItem(key);
    if (raw === 'done' || raw === 'skipped') return raw;

    const legacyRaw = localStorage.getItem(legacyOrgOwnerTourStorageKey(orgId));
    if (legacyRaw === 'done' || legacyRaw === 'skipped') {
      localStorage.setItem(key, legacyRaw);
      return legacyRaw;
    }
  } catch {
    /* private mode */
  }
  return null;
}

export function writeOrgOwnerTourStorage(userId: string, orgId: string, value: OrgOwnerTourStorage): void {
  try {
    localStorage.setItem(orgOwnerTourStorageKey(userId, orgId), value);
  } catch {
    /* private mode */
  }
}

/** True when this user has skipped or finished the tour for this org. */
export function hasOrgOwnerTourBeenDismissed(userId: string, orgId: string): boolean {
  return readOrgOwnerTourStorage(userId, orgId) !== null;
}

export function orgTourTargetFromTo(to: string): OrgOwnerTourTarget | undefined {
  const path = to.split('?')[0];
  if (path.includes('/dashboard')) return 'dashboard';
  if (path.includes('/calendar')) return 'calendar';
  if (path.includes('/appointments')) return 'appointments';
  if (path.includes('/customers')) return 'customers';
  if (path.includes('/recurring')) return 'recurring';
  if (path.endsWith('/settings') || /\/settings$/.test(path)) return 'settings';
  return undefined;
}

export function tourStepPathMatches(pathname: string, stepPath: string): boolean {
  return pathname === stepPath || pathname.startsWith(`${stepPath}/`);
}
