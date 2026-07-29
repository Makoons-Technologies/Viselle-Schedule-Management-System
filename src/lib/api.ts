import axios, { type AxiosError } from 'axios';
import type {
  Account,
  ApiErrorBody,
  Appointment,
  AppointmentInfo,
  AuthUser,
  AvailabilityRule,
  BillingInfo,
  CreateAccountInput,
  CreateAppointmentInput,
  CreateOrganizationInput,
  InviteOrgOwnerInput,
  CreateServiceInput,
  Customer,
  ImpersonateOwnerResponse,
  CustomerServiceNote,
  LoginResponse,
  Organization,
  OrganizationOwnerSummary,
  OrgPlanFeatures,
  OrganizationSettings,
  MrrGranularity,
  MrrReport,
  PlatformStats,
  StaffPermissions,
  SupportTicket,
  SupportTicketMessage,
  SupportTicketStatus,
  SupportTicketType,
  CustomWebsiteRequest,
  CustomWebsiteRequestNote,
  CustomWebsiteRequestStatus,
  RecurringAppointmentRule,
  RecurringFrequency,
  Product,
  BatchCheckoutAppointmentInput,
  BatchCheckoutPreview,
  CheckoutLineInput,
  CheckoutPreview,
  StripeConnectStatus,
  VisitStatus,
  Reminder,
  ReminderType,
  RevenueGranularity,
  RevenueReport,
  ScheduleResponse,
  Service,
  SubscriptionTier,
  WebsiteSettings,
  WebsiteSettingsResponse,
  SubdomainAvailability,
  UpdateWebsiteInput,
  UploadBookingAssetInput,
  TrialCampaign,
  TrialRedemption,
  PlatformTrialSettings,
  TrialCampaignType,
  TrialPaymentMode,
  TrialLockedTier,
  ReferralStat,
} from '@/types/api';

const TOKEN_KEY = 'viselle_auth_token';
const IMPERSONATION_ORIGIN_TOKEN_KEY = 'viselle_impersonation_origin_token';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const data = error.response?.data;
    if (data?.error) {
      throw new ApiError(
        data.error.code,
        data.error.message,
        error.response?.status ?? 500,
        data.error.details,
      );
    }
    throw new ApiError(
      'NETWORK_ERROR',
      error.response?.status === 413
        ? 'Image must be 2 MB or smaller'
        : error.message || 'Network request failed',
      error.response?.status ?? 0,
    );
  },
);

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/** The platform_owner token stashed while impersonating an org owner, so "Exit" can restore it without a re-login. */
export function getImpersonationOriginToken() {
  return localStorage.getItem(IMPERSONATION_ORIGIN_TOKEN_KEY);
}

export function setImpersonationOriginToken(token: string | null) {
  if (token) {
    localStorage.setItem(IMPERSONATION_ORIGIN_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(IMPERSONATION_ORIGIN_TOKEN_KEY);
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),
  me: () => apiClient.get<AuthUser>('/auth/me').then((r) => r.data),
  setPassword: (token: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/set-password', { token, password }).then((r) => r.data),
  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data),
  switchOrganization: (organizationId: string) =>
    apiClient.post<LoginResponse>('/auth/switch-organization', { organizationId }).then((r) => r.data),
};

export const ownerApi = {
  getPlatformStats: () =>
    apiClient.get<{ stats: PlatformStats }>('/owner/stats').then((r) => r.data),
  getMrrReport: (params?: { granularity?: MrrGranularity; from?: string; to?: string }) =>
    apiClient.get<MrrReport>('/owner/reports/mrr', { params }).then((r) => r.data),
  listOrganizations: () =>
    apiClient.get<{ organizations: Organization[] }>('/owner/organizations').then((r) => r.data),
  createOrganization: (data: CreateOrganizationInput) =>
    apiClient.post<{ organization: Organization; settings: OrganizationSettings }>(
      '/owner/organizations',
      data,
    ).then((r) => r.data),
  getOrganization: (id: string) =>
    apiClient
      .get<{ organization: Organization; owner: OrganizationOwnerSummary | null }>(
        `/owner/organizations/${id}`,
      )
      .then((r) => r.data),
  updateOrganization: (id: string, data: Partial<Organization>) =>
    apiClient.patch<{ organization: Organization }>(`/owner/organizations/${id}`, data).then((r) => r.data),
  deactivateOrganization: (id: string) =>
    apiClient.patch<{ organization: Organization }>(`/owner/organizations/${id}/deactivate`).then((r) => r.data),
  impersonateOwner: (id: string) =>
    apiClient.post<ImpersonateOwnerResponse>(`/owner/organizations/${id}/impersonate`).then((r) => r.data),
  inviteOrgOwner: (id: string, data: InviteOrgOwnerInput) =>
    apiClient
      .post<{ owner: OrganizationOwnerSummary }>(`/owner/organizations/${id}/invite-owner`, data)
      .then((r) => r.data),
  getSettings: (id: string) =>
    apiClient.get<{ settings: OrganizationSettings }>(`/owner/organizations/${id}/settings`).then((r) => r.data),
  updateSettings: (id: string, data: Partial<OrganizationSettings>) =>
    apiClient.patch<{ settings: OrganizationSettings }>(`/owner/organizations/${id}/settings`, data).then((r) => r.data),
  applyTier: (id: string, tier: Exclude<SubscriptionTier, 'custom'>) =>
    apiClient
      .post<{ settings: OrganizationSettings }>(`/owner/organizations/${id}/settings/apply-tier`, { tier })
      .then((r) => r.data),
  getBilling: (id: string) =>
    apiClient.get<{ billing: BillingInfo }>(`/owner/organizations/${id}/billing`).then((r) => r.data),
  updateBilling: (id: string, data: Partial<BillingInfo>) =>
    apiClient.patch<{ organization: Organization }>(`/owner/organizations/${id}/billing`, data).then((r) => r.data),
  getWebsite: (id: string) =>
    apiClient.get<WebsiteSettingsResponse>(`/owner/organizations/${id}/website`).then((r) => r.data),
  updateWebsite: (id: string, data: UpdateWebsiteInput) =>
    apiClient.patch<WebsiteSettingsResponse>(`/owner/organizations/${id}/website`, data).then((r) => r.data),
  checkSubdomainAvailable: (id: string, subdomain: string) =>
    apiClient
      .get<SubdomainAvailability>(
        `/owner/organizations/${id}/website/subdomain/${encodeURIComponent(subdomain)}/available`,
      )
      .then((r) => r.data),
  uploadBookingAsset: (id: string, data: UploadBookingAssetInput) =>
    apiClient
      .post<{ url: string; websiteSettings: WebsiteSettings }>(
        `/owner/organizations/${id}/website/upload-asset`,
        data,
      )
      .then((r) => r.data),
  regenerateWebsiteApiKey: (id: string) =>
    apiClient
      .post<WebsiteSettingsResponse & { apiKey: string }>(`/owner/organizations/${id}/website/regenerate-api-key`)
      .then((r) => r.data),

  listTrialCampaigns: () =>
    apiClient.get<{ campaigns: TrialCampaign[] }>('/owner/trials/campaigns').then((r) => r.data),
  createTrialCampaign: (data: {
    name: string;
    type: TrialCampaignType;
    code?: string;
    durationDays: number;
    // Omit for the default (1); null = unlimited max uses (code campaigns only).
    maxRedemptions?: number | null;
    paymentMode: TrialPaymentMode;
    lockedTier?: TrialLockedTier;
    enabled?: boolean;
    // Omit/undefined = no expiration; null explicitly clears an expiration on update.
    expiresAt?: string | null;
  }) => apiClient.post<{ campaign: TrialCampaign }>('/owner/trials/campaigns', data).then((r) => r.data),
  getTrialCampaign: (id: string) =>
    apiClient
      .get<{ campaign: TrialCampaign; redemptions: TrialRedemption[] }>(`/owner/trials/campaigns/${id}`)
      .then((r) => r.data),
  updateTrialCampaign: (
    id: string,
    data: Partial<{
      name: string;
      code: string;
      durationDays: number;
      maxRedemptions: number | null;
      paymentMode: TrialPaymentMode;
      lockedTier: TrialLockedTier;
      enabled: boolean;
      expiresAt: string | null;
    }>,
  ) => apiClient.patch<{ campaign: TrialCampaign }>(`/owner/trials/campaigns/${id}`, data).then((r) => r.data),
  listReferrals: () =>
    apiClient.get<{ referrals: ReferralStat[] }>('/owner/trials/referrals').then((r) => r.data),
  getTrialSettings: () =>
    apiClient.get<{ settings: PlatformTrialSettings }>('/owner/trials/settings').then((r) => r.data),
  updateTrialSettings: (
    data: Partial<Pick<PlatformTrialSettings, 'referralDurationDays' | 'referralPaymentMode' | 'referralLockedTier'>>,
  ) => apiClient.patch<{ settings: PlatformTrialSettings }>('/owner/trials/settings', data).then((r) => r.data),

  listSupportTickets: (params?: {
    status?: SupportTicketStatus;
    organizationId?: string;
    type?: SupportTicketType;
  }) => apiClient.get<{ tickets: SupportTicket[] }>('/owner/support-tickets', { params }).then((r) => r.data),
  getSupportTicket: (ticketId: string) =>
    apiClient
      .get<{ ticket: SupportTicket; messages: SupportTicketMessage[] }>(`/owner/support-tickets/${ticketId}`)
      .then((r) => r.data),
  updateSupportTicketStatus: (ticketId: string, status: SupportTicketStatus) =>
    apiClient
      .patch<{ ticket: SupportTicket }>(`/owner/support-tickets/${ticketId}`, { status })
      .then((r) => r.data),
  replySupportTicket: (ticketId: string, data: { body: string; isInternalNote?: boolean }) =>
    apiClient
      .post<{ message: SupportTicketMessage }>(`/owner/support-tickets/${ticketId}/messages`, data)
      .then((r) => r.data),

  listCustomWebsiteRequests: (params?: { status?: CustomWebsiteRequestStatus; organizationId?: string }) =>
    apiClient
      .get<{ requests: CustomWebsiteRequest[] }>('/owner/custom-website-requests', { params })
      .then((r) => r.data),
  getCustomWebsiteRequest: (requestId: string) =>
    apiClient
      .get<{ request: CustomWebsiteRequest; notes: CustomWebsiteRequestNote[] }>(
        `/owner/custom-website-requests/${requestId}`,
      )
      .then((r) => r.data),
  updateCustomWebsiteRequestStatus: (requestId: string, status: CustomWebsiteRequestStatus) =>
    apiClient
      .patch<{ request: CustomWebsiteRequest }>(`/owner/custom-website-requests/${requestId}`, { status })
      .then((r) => r.data),
  addCustomWebsiteRequestNote: (requestId: string, body: string) =>
    apiClient
      .post<{ note: CustomWebsiteRequestNote }>(`/owner/custom-website-requests/${requestId}/notes`, {
        body,
      })
      .then((r) => r.data),
};

export const supportApi = {
  createTicket: (data: { subject: string; body: string; type: SupportTicketType }) =>
    apiClient.post<{ ticket: SupportTicket }>('/support-tickets', data).then((r) => r.data),
  listMyTickets: (params?: { type?: SupportTicketType }) =>
    apiClient.get<{ tickets: SupportTicket[] }>('/support-tickets', { params }).then((r) => r.data),
  getMyTicket: (ticketId: string) =>
    apiClient
      .get<{ ticket: SupportTicket; messages: SupportTicketMessage[] }>(`/support-tickets/${ticketId}`)
      .then((r) => r.data),
  replyToTicket: (ticketId: string, body: string) =>
    apiClient
      .post<{ message: SupportTicketMessage }>(`/support-tickets/${ticketId}/messages`, { body })
      .then((r) => r.data),
};

export const orgApi = {
  getOrganization: (orgId: string) =>
    apiClient.get<{ organization: Organization }>(`/organizations/${orgId}`).then((r) => r.data),
  getPlan: (orgId: string) =>
    apiClient.get<{ plan: OrgPlanFeatures }>(`/organizations/${orgId}/plan`).then((r) => r.data),
  changePlan: (orgId: string, tier: Exclude<SubscriptionTier, 'custom'>) =>
    apiClient
      .post<{
        plan: OrgPlanFeatures;
        previousTier: SubscriptionTier | null;
        change: 'upgrade' | 'downgrade' | 'same' | 'switch';
        billingMode: 'stripe_updated' | 'settings_only' | 'settings_only_stripe_failed';
        message: string;
        hasStripeSubscription: boolean;
      }>(`/organizations/${orgId}/plan/change`, { tier })
      .then((r) => r.data),
  createPlanCheckout: (orgId: string, tier: Exclude<SubscriptionTier, 'custom'>) =>
    apiClient
      .post<{ checkoutUrl?: string; sessionId: string }>(`/organizations/${orgId}/plan/checkout`, {
        tier,
      })
      .then((r) => r.data),
  getPlanCheckoutStatus: (orgId: string, sessionId: string) =>
    apiClient
      .get<{ status: 'pending' | 'completed' | 'failed'; plan: OrgPlanFeatures }>(
        `/organizations/${orgId}/plan/checkout/${encodeURIComponent(sessionId)}`,
      )
      .then((r) => r.data),
  getStaffPermissions: (orgId: string) =>
    apiClient.get<{ staffPermissions: StaffPermissions }>(`/organizations/${orgId}/staff-permissions`).then((r) => r.data),
  updateStaffPermissions: (orgId: string, data: Partial<StaffPermissions>) =>
    apiClient
      .patch<{ staffPermissions: StaffPermissions }>(`/organizations/${orgId}/staff-permissions`, data)
      .then((r) => r.data),
  updateOrganization: (orgId: string, data: Pick<Partial<Organization>, 'name' | 'slug' | 'publicBookingEnabled' | 'batchCheckoutEnabled' | 'emailRemindersOptIn' | 'smsRemindersOptIn' | 'emailReminderHoursBefore' | 'smsReminderHoursBefore' | 'confirmationRequestsOptIn' | 'confirmationDaysBefore' | 'city' | 'address' | 'phone'>) =>
    apiClient.patch<{ organization: Organization }>(`/organizations/${orgId}`, data).then((r) => r.data),
  getWebsite: (orgId: string) =>
    apiClient.get<WebsiteSettingsResponse>(`/organizations/${orgId}/website`).then((r) => r.data),
  updateWebsite: (orgId: string, data: UpdateWebsiteInput) =>
    apiClient.patch<WebsiteSettingsResponse>(`/organizations/${orgId}/website`, data).then((r) => r.data),
  checkSubdomainAvailable: (orgId: string, subdomain: string) =>
    apiClient
      .get<SubdomainAvailability>(
        `/organizations/${orgId}/website/subdomain/${encodeURIComponent(subdomain)}/available`,
      )
      .then((r) => r.data),
  uploadBookingAsset: (orgId: string, data: UploadBookingAssetInput) =>
    apiClient
      .post<{ url: string; websiteSettings: WebsiteSettings }>(`/organizations/${orgId}/website/upload-asset`, data)
      .then((r) => r.data),
  regenerateWebsiteApiKey: (orgId: string) =>
    apiClient
      .post<WebsiteSettingsResponse & { apiKey: string }>(`/organizations/${orgId}/website/regenerate-api-key`)
      .then((r) => r.data),

  listAccounts: (orgId: string) =>
    apiClient.get<{ accounts: Account[] }>(`/organizations/${orgId}/accounts`).then((r) => r.data),
  createAccount: (orgId: string, data: CreateAccountInput) =>
    apiClient.post<{ account: Account }>(`/organizations/${orgId}/accounts`, data).then((r) => r.data),
  updateAccount: (
    orgId: string,
    accountId: string,
    data: Partial<CreateAccountInput & { status: 'active' | 'inactive' }>,
  ) =>
    apiClient.patch<{ account: Account }>(`/organizations/${orgId}/accounts/${accountId}`, data).then((r) => r.data),
  deleteAccount: (orgId: string, accountId: string) =>
    apiClient.delete(`/organizations/${orgId}/accounts/${accountId}`).then((r) => r.data),

  listServices: (orgId: string) =>
    apiClient.get<{ services: Service[] }>(`/organizations/${orgId}/services`).then((r) => r.data),
  createService: (orgId: string, data: CreateServiceInput) =>
    apiClient.post<{ service: Service }>(`/organizations/${orgId}/services`, data).then((r) => r.data),
  updateService: (orgId: string, serviceId: string, data: Partial<CreateServiceInput & { isActive: boolean }>) =>
    apiClient.patch<{ service: Service }>(`/organizations/${orgId}/services/${serviceId}`, data).then((r) => r.data),

  listAppointments: (orgId: string, params?: Record<string, string>) =>
    apiClient.get<{ appointments: Appointment[] }>(`/organizations/${orgId}/appointments`, { params }).then((r) => r.data),
  createAppointment: (orgId: string, data: CreateAppointmentInput) =>
    apiClient
      .post<{ appointment: Appointment; customer: Customer; reminders: Reminder[] }>(
        `/organizations/${orgId}/appointments`,
        data,
      )
      .then((r) => r.data),
  updateAppointment: (orgId: string, appointmentId: string, data: Partial<Appointment>) =>
    apiClient.patch<{ appointment: Appointment }>(`/organizations/${orgId}/appointments/${appointmentId}`, data).then((r) => r.data),
  cancelAppointment: (
    orgId: string,
    appointmentId: string,
    data?: { reason?: string; scope?: 'single' | 'future'; occurrenceDate?: string },
  ) =>
    apiClient
      .patch<{ appointment: Appointment }>(`/organizations/${orgId}/appointments/${appointmentId}/cancel`, data ?? {})
      .then((r) => r.data),
  makeAppointmentRecurring: (
    orgId: string,
    appointmentId: string,
    data: { frequency: RecurringFrequency; interval: number; endDate?: string; daysOfWeek: number[]; dayTimes?: Record<string, string> },
  ) =>
    apiClient
      .post<{
        recurringAppointmentRule: RecurringAppointmentRule;
        linkedAppointment: Appointment;
        createdAppointments: Appointment[];
      }>(`/organizations/${orgId}/appointments/${appointmentId}/recurring`, data)
      .then((r) => r.data),
  rescheduleAppointment: (orgId: string, appointmentId: string, data: { accountId: string; startTime: string; timezone: string }) =>
    apiClient.patch<{ appointment: Appointment }>(`/organizations/${orgId}/appointments/${appointmentId}/reschedule`, data).then((r) => r.data),
  listReminders: (orgId: string, appointmentId: string) =>
    apiClient.get<{ reminders: Reminder[] }>(`/organizations/${orgId}/appointments/${appointmentId}/reminders`).then((r) => r.data),
  sendReminder: (orgId: string, appointmentId: string, type: ReminderType) =>
    apiClient.post(`/organizations/${orgId}/appointments/${appointmentId}/reminders/send`, { type }).then((r) => r.data),

  listCustomers: (orgId: string) =>
    apiClient.get<{ customers: Customer[] }>(`/organizations/${orgId}/customers`).then((r) => r.data),

  getRevenueReport: (orgId: string, params?: { granularity?: RevenueGranularity; from?: string; to?: string }) =>
    apiClient.get<RevenueReport>(`/organizations/${orgId}/reports/revenue`, { params }).then((r) => r.data),
  updateCustomer: (
    orgId: string,
    customerId: string,
    data: Partial<Pick<Customer, 'firstName' | 'lastName' | 'email' | 'phone'>>,
  ) =>
    apiClient
      .patch<{ customer: Customer }>(`/organizations/${orgId}/customers/${customerId}`, data)
      .then((r) => r.data),
  listCustomerServiceNotes: (orgId: string, customerId: string, serviceId: string) =>
    apiClient
      .get<{ notes: CustomerServiceNote[] }>(`/organizations/${orgId}/customers/${customerId}/service-notes`, {
        params: { serviceId },
      })
      .then((r) => r.data),

  listAvailabilityRules: (orgId: string, accountId: string) =>
    apiClient.get<{ availabilityRules: AvailabilityRule[] }>(`/organizations/${orgId}/accounts/${accountId}/availability-rules`).then((r) => r.data),
  createAvailabilityRule: (orgId: string, accountId: string, data: { dayOfWeek: number; startTime: string; endTime: string }) =>
    apiClient.post<{ availabilityRule: AvailabilityRule }>(`/organizations/${orgId}/accounts/${accountId}/availability-rules`, data).then((r) => r.data),
  deleteAvailabilityRule: (orgId: string, accountId: string, ruleId: string) =>
    apiClient.delete(`/organizations/${orgId}/accounts/${accountId}/availability-rules/${ruleId}`).then((r) => r.data),

  getAccountAvailability: (
    orgId: string,
    accountId: string,
    params: { serviceId: string; startDate: string; endDate: string; timezone: string },
  ) =>
    apiClient
      .get<{ availableSlots: Array<{ startTime: string; endTime: string }> }>(
        `/organizations/${orgId}/accounts/${accountId}/availability`,
        { params },
      )
      .then((r) => r.data),

  listRecurring: (orgId: string) =>
    apiClient.get<{ recurringAppointmentRules: RecurringAppointmentRule[] }>(`/organizations/${orgId}/recurring-appointments`).then((r) => r.data),
  updateRecurring: (
    orgId: string,
    ruleId: string,
    data: {
      frequency?: RecurringFrequency;
      interval?: number;
      endDate?: string | null;
      daysOfWeek?: number[];
      dayTimes?: Record<string, string>;
      status?: 'active' | 'paused';
      syncFutureAppointments?: boolean;
    },
  ) =>
    apiClient
      .patch<{ recurringAppointmentRule: RecurringAppointmentRule; syncedFutureAppointments: number }>(
        `/organizations/${orgId}/recurring-appointments/${ruleId}`,
        data,
      )
      .then((r) => r.data),
  deleteRecurring: (orgId: string, ruleId: string) =>
    apiClient
      .delete<{ success: boolean; deletedAppointments: number }>(
        `/organizations/${orgId}/recurring-appointments/${ruleId}`,
      )
      .then((r) => r.data),

  updateAppointmentVisitStatus: (
    orgId: string,
    appointmentId: string,
    visitStatus: VisitStatus,
    options?: { occurrenceDate?: string },
  ) =>
    apiClient
      .patch<{ appointment: Appointment }>(`/organizations/${orgId}/appointments/${appointmentId}/visit-status`, {
        visitStatus,
        occurrenceDate: options?.occurrenceDate,
      })
      .then((r) => r.data),

  undoAppointmentCheckIn: (orgId: string, appointmentId: string, options?: { occurrenceDate?: string }) =>
    apiClient
      .post<{ appointment: Appointment }>(`/organizations/${orgId}/appointments/${appointmentId}/undo-check-in`, {
        occurrenceDate: options?.occurrenceDate,
      })
      .then((r) => r.data),

  listProducts: (orgId: string, activeOnly = false) =>
    apiClient
      .get<{ products: Product[] }>(`/organizations/${orgId}/products`, { params: { activeOnly } })
      .then((r) => r.data),
  listLowStockProducts: (orgId: string) =>
    apiClient.get<{ products: Product[] }>(`/organizations/${orgId}/products/low-stock`).then((r) => r.data),
  createProduct: (
    orgId: string,
    data: {
      name: string;
      sku?: string;
      barcode?: string;
      description?: string;
      retailPriceCents: number;
      costCents?: number;
      stockQuantity?: number;
      lowStockThreshold?: number;
      trackInventory?: boolean;
    },
  ) => apiClient.post<{ product: Product }>(`/organizations/${orgId}/products`, data).then((r) => r.data),
  updateProduct: (orgId: string, productId: string, data: Partial<Product>) =>
    apiClient.patch<{ product: Product }>(`/organizations/${orgId}/products/${productId}`, data).then((r) => r.data),
  adjustProductStock: (orgId: string, productId: string, data: { quantityDelta: number; note?: string }) =>
    apiClient
      .post<{ product: Product }>(`/organizations/${orgId}/products/${productId}/adjust-stock`, data)
      .then((r) => r.data),
  deleteProduct: (orgId: string, productId: string) =>
    apiClient.delete<{ product: Product }>(`/organizations/${orgId}/products/${productId}`).then((r) => r.data),

  previewCheckout: (orgId: string, appointmentId: string, data: { lines: CheckoutLineInput[]; tipCents: number }) =>
    apiClient
      .post<CheckoutPreview>(`/organizations/${orgId}/appointments/${appointmentId}/checkout/preview`, data)
      .then((r) => r.data),
  checkoutCash: (orgId: string, appointmentId: string, data: { lines: CheckoutLineInput[]; tipCents: number }) =>
    apiClient
      .post(`/organizations/${orgId}/appointments/${appointmentId}/checkout/cash`, data)
      .then((r) => r.data),
  checkoutCard: (
    orgId: string,
    appointmentId: string,
    data: { lines: CheckoutLineInput[]; tipCents: number; mode?: 'terminal' | 'online' },
  ) =>
    apiClient
      .post<{
        saleId: string;
        paymentIntentId: string;
        clientSecret: string;
        stripeAccountId: string;
        totalCents: number;
      }>(`/organizations/${orgId}/appointments/${appointmentId}/checkout/card`, data)
      .then((r) => r.data),
  confirmCheckoutCard: (orgId: string, appointmentId: string, paymentIntentId: string) =>
    apiClient
      .post<{ confirmed: true }>(
        `/organizations/${orgId}/appointments/${appointmentId}/checkout/card/confirm`,
        { paymentIntentId },
      )
      .then((r) => r.data),
  previewBatchCheckout: (orgId: string, data: { appointments: BatchCheckoutAppointmentInput[]; tipCents: number }) =>
    apiClient
      .post<BatchCheckoutPreview>(`/organizations/${orgId}/checkout/batch/preview`, data)
      .then((r) => r.data),
  batchCheckoutCash: (orgId: string, data: { appointments: BatchCheckoutAppointmentInput[]; tipCents: number }) =>
    apiClient
      .post<{ paymentGroupId: string; saleIds: string[]; totalCents: number }>(
        `/organizations/${orgId}/checkout/batch/cash`,
        data,
      )
      .then((r) => r.data),
  batchCheckoutCard: (
    orgId: string,
    data: { appointments: BatchCheckoutAppointmentInput[]; tipCents: number; mode?: 'terminal' | 'online' },
  ) =>
    apiClient
      .post<{
        paymentGroupId: string;
        saleIds: string[];
        paymentIntentId: string;
        clientSecret: string;
        stripeAccountId: string;
        totalCents: number;
      }>(`/organizations/${orgId}/checkout/batch/card`, data)
      .then((r) => r.data),
  confirmBatchCheckoutCard: (orgId: string, paymentIntentId: string) =>
    apiClient
      .post<{ confirmed: true }>(`/organizations/${orgId}/checkout/batch/card/confirm`, {
        paymentIntentId,
      })
      .then((r) => r.data),

  getStripeConnectStatus: (orgId: string) =>
    apiClient.get<StripeConnectStatus>(`/organizations/${orgId}/stripe-connect/status`).then((r) => r.data),
  startStripeConnectOnboarding: (orgId: string) =>
    apiClient.post<{ url: string; accountId: string }>(`/organizations/${orgId}/stripe-connect/onboard`).then((r) => r.data),
  syncStripeConnectStatus: (orgId: string) =>
    apiClient.post<{ chargesEnabled: boolean; onboardingComplete: boolean }>(`/organizations/${orgId}/stripe-connect/sync`).then((r) => r.data),
  getTerminalConnectionToken: (orgId: string) =>
    apiClient.post<{ secret: string }>(`/organizations/${orgId}/stripe-connect/terminal/connection-token`).then((r) => r.data),
  registerTerminalReader: (orgId: string, data: { registrationCode: string; label?: string }) =>
    apiClient.post<{ readerId: string; label: string }>(`/organizations/${orgId}/stripe-connect/terminal/register-reader`, data).then((r) => r.data),
};

export const appointmentApi = {
  getInfo: (appointmentId: string, occurrenceDate?: string) =>
    apiClient
      .get<AppointmentInfo>(`/appointments/${appointmentId}/info`, {
        params: occurrenceDate ? { occurrenceDate } : undefined,
      })
      .then((r) => r.data),
};

export const scheduleApi = {
  mySchedule: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ScheduleResponse>('/me/schedule', { params }).then((r) => r.data),
};
