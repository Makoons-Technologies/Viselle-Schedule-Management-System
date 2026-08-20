import { apiClient } from '@/lib/api';
import {
  getSubdomainBookingSlug,
  getSubdomainBookingUrl,
  isSubdomainBookingHost,
} from '@/lib/subdomain-booking';
import type {
  BookingPaymentMode,
  FirstVisitPaymentMode,
  Service,
  SiteTemplate,
  BookingBranding,
} from '@/types/api';

export interface PublicFirstVisitPayment {
  mode: FirstVisitPaymentMode;
  depositCents?: number | null;
  /** Org policy is on and Stripe Connect can charge. Not per-guest. */
  required: boolean;
  stripeReady: boolean;
  publishableKey?: string | null;
  stripeAccountId?: string | null;
}

export type FirstVisitRequirementReason = 'first_visit' | 'returning' | 'disabled' | 'stripe_not_ready';

export interface FirstVisitRequirement {
  required: boolean;
  mode: FirstVisitPaymentMode;
  depositCents: number | null;
  reason: FirstVisitRequirementReason;
  publishableKey: string | null;
  stripeAccountId: string | null;
}

export interface PublicBookingPayment {
  bookingPaymentId: string;
  mode: BookingPaymentMode;
  amountCents: number | null;
  clientSecret: string;
  stripeAccountId: string;
  publishableKey: string;
}

export interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  publicBookingEnabled: boolean;
  smsRemindersEnabled?: boolean;
  /** False while the platform sending number is under A2P / carrier review. */
  smsSendingEnabled?: boolean;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  firstVisitPayment?: PublicFirstVisitPayment | null;
  bookingSite: {
    hostingMode: string;
    siteTemplate: SiteTemplate | null;
    deploymentStatus: string;
    subdomain?: string | null;
    branding: BookingBranding;
    /** Included viselle.net/book/:slug page. Undefined on older APIs means on. */
    pathBookingEnabled?: boolean;
  } | null;
}

export interface PublicAccount {
  id: string;
  firstName: string;
  lastName: string;
}

export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  isActive: boolean;
}

export interface PublicSlot {
  startTime: string;
  endTime: string;
  accountId: string;
}

export interface ManagedAppointment {
  organization: PublicOrganization;
  appointment: {
    id: string;
    visitStatus: string;
    paymentStatus: string;
    startTime: string;
    endTime: string;
    timezone: string;
    appointmentNotes?: string | null;
    customerConfirmedAt?: string | null;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    priceCents?: number | null;
  };
  account: {
    id: string;
    firstName: string;
    lastName: string;
  };
  location?: string | null;
  mapsUrl?: string | null;
  calendarUrl?: string | null;
  googleCalendarUrl?: string | null;
}

export type CustomerAppointmentTab = 'previous' | 'current' | 'future';
export type CustomerAppointmentAction = 'view' | 'receipt';

export interface CustomerAppointmentListItem {
  id: string;
  managementToken: string;
  startTime: string;
  endTime: string;
  timezone: string;
  visitStatus: string;
  paymentStatus: string;
  serviceName: string;
  action: CustomerAppointmentAction;
  tab: CustomerAppointmentTab;
}

export interface CustomerAppointmentsResponse {
  organization: PublicOrganization;
  seedAppointmentId: string;
  previous: CustomerAppointmentListItem[];
  current: CustomerAppointmentListItem[];
  future: CustomerAppointmentListItem[];
}

export interface BookAppointmentResponse {
  appointment: {
    id: string;
    visitStatus: string;
    paymentStatus: string;
    startTime: string;
    endTime: string;
  };
  managementToken?: string | null;
  confirmationMessage: string;
  bookingPayment?: {
    id: string;
    mode: BookingPaymentMode;
    amountCents: number | null;
    status: string;
  } | null;
}

export const publicBookingApi = {
  getOrganization: async (slug: string) => {
    const { data } = await apiClient.get<{
      organization?: PublicOrganization;
      firstVisitPayment?: PublicFirstVisitPayment;
    }>(`/public/organizations/${slug}`);
    const organization = data.organization ?? (data as PublicOrganization);
    return {
      organization: {
        ...organization,
        firstVisitPayment: organization.firstVisitPayment ?? data.firstVisitPayment ?? null,
      },
    };
  },
  getSmsConsent: (slug: string, params: { email?: string; phone?: string }) =>
    apiClient
      .get<{ smsConsented: boolean }>(`/public/organizations/${slug}/sms-consent`, { params })
      .then((r) => r.data),
  getFirstVisitRequirement: (slug: string, params: { email?: string; phone?: string }) =>
    apiClient
      .get<FirstVisitRequirement>(`/public/organizations/${slug}/first-visit-requirement`, { params })
      .then((r) => r.data),
  createBookingPayment: (slug: string, data: { email?: string; phone?: string }) =>
    apiClient
      .post<PublicBookingPayment>(`/public/organizations/${slug}/booking-payments`, data)
      .then((r) => r.data),
  getServices: (slug: string) =>
    apiClient.get<{ services: Service[] }>(`/public/organizations/${slug}/services`).then((r) => r.data),
  getProducts: (slug: string) =>
    apiClient.get<{ products: PublicProduct[] }>(`/public/organizations/${slug}/products`).then((r) => r.data),
  getProduct: (slug: string, productId: string) =>
    apiClient
      .get<{ product: PublicProduct }>(`/public/organizations/${slug}/products/${productId}`)
      .then((r) => r.data),
  getAccounts: (slug: string) =>
    apiClient.get<{ accounts: PublicAccount[] }>(`/public/organizations/${slug}/accounts`).then((r) => r.data),
  getAvailability: (
    slug: string,
    params: { serviceId: string; startDate: string; endDate: string; timezone: string; accountId?: string },
  ) => {
    const { accountId, ...query } = params;
    const path = accountId
      ? `/public/organizations/${slug}/accounts/${accountId}/availability`
      : `/public/organizations/${slug}/availability`;
    return apiClient
      .get<{ availableSlots: PublicSlot[] }>(path, { params: query })
      .then((r) => r.data);
  },
  book: (
    slug: string,
    data: {
      accountId: string;
      serviceId: string;
      customer: { firstName: string; lastName: string; email?: string; phone?: string };
      startTime: string;
      timezone: string;
      appointmentNotes?: string;
      smsOptIn?: boolean;
      bookingPaymentId?: string;
    },
  ) =>
    apiClient
      .post<BookAppointmentResponse>(`/public/organizations/${slug}/appointments`, data)
      .then((r) => r.data),
  getManagedAppointment: (managementToken: string) =>
    apiClient
      .get<ManagedAppointment>(`/public/appointments/${managementToken}`)
      .then((r) => r.data),
  listCustomerAppointments: (managementToken: string) =>
    apiClient
      .get<CustomerAppointmentsResponse>(`/public/appointments/${managementToken}/customer-appointments`)
      .then((r) => r.data),
  rescheduleManagedAppointment: (
    managementToken: string,
    data: { startTime: string; timezone: string },
  ) =>
    apiClient
      .patch<{ appointment: ManagedAppointment['appointment']; message: string }>(
        `/public/appointments/${managementToken}/reschedule`,
        data,
      )
      .then((r) => r.data),
  cancelManagedAppointment: (managementToken: string, reason?: string) =>
    apiClient
      .patch<{ appointment: ManagedAppointment['appointment']; message: string }>(
        `/public/appointments/${managementToken}/cancel`,
        reason ? { reason } : {},
      )
      .then((r) => r.data),
  confirmManagedAppointment: (managementToken: string) =>
    apiClient
      .patch<{
        appointment: ManagedAppointment['appointment'];
        message: string;
        alreadyConfirmed: boolean;
      }>(`/public/appointments/${managementToken}/confirm`)
      .then((r) => r.data),
};

export function getManageBookingUrl(slug: string, managementToken: string): string {
  if (isSubdomainBookingHost() && getSubdomainBookingSlug() === slug) {
    return `${window.location.origin}/manage/${managementToken}`;
  }
  const base = (import.meta.env.VITE_BOOKING_BASE_URL as string | undefined) ?? window.location.origin;
  return `${base.replace(/\/$/, '')}/book/${slug}/manage/${managementToken}`;
}

export function getBookingPageUrl(slug: string): string {
  const configured = (import.meta.env.VITE_BOOKING_BASE_URL as string | undefined)?.trim();
  const base = configured || window.location.origin;
  return `${base.replace(/\/$/, '')}/book/${slug}`;
}

/** Prefer the live app origin when the API still returns a localhost booking URL. */
export function resolvePathBookingUrl(apiUrl: string | undefined | null, slug: string): string {
  if (apiUrl && !/localhost|127\.0\.0\.1/i.test(apiUrl)) {
    return apiUrl.replace(/\/$/, '');
  }
  return getBookingPageUrl(slug);
}

export type ShareableBookingLinkKind = 'subdomain' | 'custom' | 'path';

export function displayBookingHost(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

/** The URL an org should share: hosted subdomain, custom site, or included /book/ path. */
export function getShareableBookingLink(data: {
  websiteSettings: { hostingMode: string; deployedSiteUrl?: string | null };
  subdomainUrl: string;
  pathBookingUrl: string;
  organizationSlug: string;
  effectiveSubdomain?: string;
  subdomainBaseDomain?: string;
  apiAccess?: { allowedOrigins: string[] };
}): { url: string; kind: ShareableBookingLinkKind } {
  const mode = data.websiteSettings.hostingMode;

  if (mode === 'subdomain') {
    const url =
      data.subdomainUrl ||
      (data.effectiveSubdomain && data.subdomainBaseDomain
        ? getSubdomainBookingUrl(data.effectiveSubdomain, data.subdomainBaseDomain)
        : '');
    if (url) return { url: url.replace(/\/$/, ''), kind: 'subdomain' };
  }

  if (mode === 'external_api') {
    const deployed = data.websiteSettings.deployedSiteUrl;
    if (deployed && /^https?:\/\//i.test(deployed) && !/localhost|127\.0\.0\.1/i.test(deployed)) {
      return { url: deployed.replace(/\/$/, ''), kind: 'custom' };
    }
    const origin = (data.apiAccess?.allowedOrigins ?? []).find((value) => /^https?:\/\//i.test(value.trim()));
    if (origin) return { url: origin.trim().replace(/\/$/, ''), kind: 'custom' };
  }

  const deployed = data.websiteSettings.deployedSiteUrl;
  if (deployed && /^https?:\/\//i.test(deployed) && !/localhost|127\.0\.0\.1/i.test(deployed)) {
    const kind: ShareableBookingLinkKind = mode === 'subdomain' ? 'subdomain' : 'path';
    return { url: deployed.replace(/\/$/, ''), kind };
  }

  return {
    url: resolvePathBookingUrl(data.pathBookingUrl, data.organizationSlug),
    kind: 'path',
  };
}

export { getSubdomainBookingUrl };
