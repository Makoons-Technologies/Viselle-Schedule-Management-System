import { apiClient } from '@/lib/api';
import { getSubdomainBookingSlug, isSubdomainBookingHost } from '@/lib/subdomain-booking';
import type { Service, SiteTemplate, BookingBranding } from '@/types/api';

export interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  publicBookingEnabled: boolean;
  bookingSite: {
    hostingMode: string;
    siteTemplate: SiteTemplate | null;
    deploymentStatus: string;
    branding: BookingBranding;
  } | null;
}

export interface PublicAccount {
  id: string;
  firstName: string;
  lastName: string;
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
}

export const publicBookingApi = {
  getOrganization: (slug: string) =>
    apiClient.get<{ organization: PublicOrganization }>(`/public/organizations/${slug}`).then((r) => r.data),
  getServices: (slug: string) =>
    apiClient.get<{ services: Service[] }>(`/public/organizations/${slug}/services`).then((r) => r.data),
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
    },
  ) =>
    apiClient
      .post<BookAppointmentResponse>(`/public/organizations/${slug}/appointments`, data)
      .then((r) => r.data),
  getManagedAppointment: (managementToken: string) =>
    apiClient
      .get<ManagedAppointment>(`/public/appointments/${managementToken}`)
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

export { getSubdomainBookingUrl } from '@/lib/subdomain-booking';
