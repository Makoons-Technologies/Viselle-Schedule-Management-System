import { apiClient } from '@/lib/api';
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
    apiClient.post<{ confirmationMessage: string }>(`/public/organizations/${slug}/appointments`, data).then((r) => r.data),
};

export function getBookingPageUrl(slug: string): string {
  const base = (import.meta.env.VITE_BOOKING_BASE_URL as string | undefined) ?? window.location.origin;
  return `${base.replace(/\/$/, '')}/book/${slug}`;
}
