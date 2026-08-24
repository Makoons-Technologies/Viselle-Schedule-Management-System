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
  LeaveOrDeleteOrgResponse,
  LoginResponse,
  Organization,
  FirstVisitPaymentMode,
  OwnerFirstVisitPayment,
  OrganizationOwnerSummary,
  OrgPlanFeatures,
  OrganizationSettings,
  MrrGranularity,
  MrrReport,
  PlatformStats,
  StaffPermissions,
  InboxLinearIssue,
  SupportTicket,
  SupportTicketAgentBrief,
  SupportTicketMessage,
  SupportTicketStatus,
  SupportTicketType,
  SupportAttachmentUpload,
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
  HomepageBlock,
  OrgForm,
  OrgFormStatus,
  OrgFormVisibility,
  OrgFormVersion,
  PublicOrgForm,
  FormioSchema,
  OrgFormSubmission,
  WaitlistEntry,
  WaitlistStatus,
  GiftCard,
  ServicePackage,
  CustomerPackage,
  MembershipPlan,
  CustomerMembership,
  CustomerMembershipStatus,
  CommissionReport,
  StaffPayoutPreview,
  StaffPayoutPreviewRow,
  StaffPayoutSettings,
  DeliverReceiptResult,
  SendInvoiceResult,
  PublicInvoiceView,
  ReceiptChannel,
  InvoiceStatus,
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

/** Login/reset must not send a leftover session token — a 401 then looks like a failed password. */
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/forgot-password', '/auth/set-password'];

/**
 * Public catalog (`/public/organizations/:key`, services, slots, book).
 * The API treats any `Authorization: Bearer` as an external booking API key.
 * A leftover owner/staff JWT then 403s as "Invalid API key", and /book maps
 * that to "Online booking is not available for this business."
 */
const PUBLIC_CATALOG_PATH_MARKER = '/public/';

function requestPathname(url: string): string {
  try {
    const path = url.startsWith('http') ? new URL(url).pathname : url;
    return path.split(/[?#]/, 1)[0] ?? path;
  } catch {
    return url.split(/[?#]/, 1)[0] ?? url;
  }
}

/** True when the request must stay keyless (login/reset + public /book catalog). */
export function shouldOmitAuthHeader(url: string | undefined): boolean {
  if (!url) return false;
  const path = requestPathname(url);
  if (PUBLIC_AUTH_PATHS.some((p) => path.includes(p))) return true;
  return path.includes(PUBLIC_CATALOG_PATH_MARKER);
}

export const UNREACHABLE_SERVER_MESSAGE =
  'Could not reach the server. Check your connection and try again.';
export const SERVER_REQUEST_FAILED_MESSAGE = 'The server could not complete this request. Try again.';

type RequestFailureLike = {
  message?: string;
  code?: string;
  status?: number;
  response?: { status?: number } | null;
};

function isAxiosNetworkFailure(err: RequestFailureLike): boolean {
  const status = err.response?.status ?? err.status;
  if (status && status > 0) return false;
  return (
    err.code === 'ERR_NETWORK' ||
    err.code === 'NETWORK_ERROR' ||
    err.message === 'Network Error' ||
    err.message === 'Network request failed' ||
    !err.response
  );
}

/** True when the browser never got an HTTP response (axios Network Error / ERR_FAILED). */
export function isUnreachableRequestError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status === 0 || err.message === UNREACHABLE_SERVER_MESSAGE;
  }
  if (err instanceof Error && (err.message === 'Network Error' || err.message === 'Network request failed')) {
    return true;
  }
  if (err && typeof err === 'object') {
    return isAxiosNetworkFailure(err as RequestFailureLike);
  }
  return false;
}

/** User-facing copy when the API body has no `error` payload (network / 5xx / 413). */
export function getFallbackRequestErrorMessage(err: RequestFailureLike): string {
  const status = err.response?.status ?? (err.status && err.status > 0 ? err.status : undefined);
  if (status === 413) return 'Image must be 2 MB or smaller';
  if (status && status >= 500) return SERVER_REQUEST_FAILED_MESSAGE;
  if (isAxiosNetworkFailure(err)) return UNREACHABLE_SERVER_MESSAGE;
  return err.message?.trim() || 'Network request failed';
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 413) return 'Image must be 2 MB or smaller';
    if (err.status >= 500) return err.message.trim() || SERVER_REQUEST_FAILED_MESSAGE;
    if (err.status === 0 || err.code === 'NETWORK_ERROR') {
      const message = err.message.trim();
      if (!message || message === 'Network Error' || message === 'Network request failed') {
        return UNREACHABLE_SERVER_MESSAGE;
      }
      return message;
    }
    if (err.message.trim()) return err.message;
  }
  if (err instanceof Error && err.message.trim()) {
    if (err.message === 'Network Error' || err.message === 'Network request failed') {
      return UNREACHABLE_SERVER_MESSAGE;
    }
    return err.message;
  }
  return fallback;
}

export function getLoginErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code === 'PASSWORD_SETUP_REQUIRED') {
    return 'Check your email for an invite link, or use Forgot password to request a new one.';
  }
  if (err instanceof ApiError && err.status === 401) {
    return err.message.trim() || 'Incorrect email or password.';
  }
  return getApiErrorMessage(err, 'Sign in failed');
}

apiClient.interceptors.request.use((config) => {
  if (shouldOmitAuthHeader(config.url)) {
    delete config.headers.Authorization;
    return config;
  }
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** True when the browser aborted the request (Cancel on a blocking dialog). */
export function isRequestAborted(err: unknown): boolean {
  if (axios.isCancel(err)) return true;
  if (typeof err === 'object' && err && 'code' in err && (err as { code?: string }).code === 'ERR_CANCELED') {
    return true;
  }
  if (err instanceof Error) {
    if (err.name === 'CanceledError' || err.name === 'AbortError') return true;
    const message = err.message.toLowerCase();
    if (message === 'canceled' || message === 'cancelled') return true;
  }
  return false;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (isRequestAborted(error)) {
      return Promise.reject(error);
    }
    const data = error.response?.data;
    if (data?.error) {
      return Promise.reject(
        new ApiError(
          data.error.code,
          data.error.message,
          error.response?.status ?? 500,
          data.error.details,
        ),
      );
    }
    return Promise.reject(
      new ApiError(
        error.response?.status && error.response.status >= 500 ? 'SERVER_ERROR' : 'NETWORK_ERROR',
        getFallbackRequestErrorMessage(error),
        error.response?.status ?? 0,
      ),
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
  leaveOrganization: (organizationId: string) =>
    apiClient
      .post<LeaveOrDeleteOrgResponse>('/auth/leave-organization', { organizationId })
      .then((r) => r.data),
};

export const ownerApi = {
  getPlatformStats: () =>
    apiClient.get<{ stats: PlatformStats }>('/owner/stats').then((r) => r.data),
  getMrrReport: (params?: { granularity?: MrrGranularity; from?: string; to?: string }) =>
    apiClient.get<MrrReport>('/owner/reports/mrr', { params }).then((r) => r.data),
  listOrganizations: () =>
    apiClient.get<{ organizations: Organization[] }>('/owner/organizations').then((r) => r.data),
  createOrganization: (data: CreateOrganizationInput) =>
    apiClient
      .post<{
        organization: Organization;
        settings: OrganizationSettings;
        owner?: OrganizationOwnerSummary | null;
        emailSent?: boolean;
      }>('/owner/organizations', data)
      .then((r) => r.data),
  getOrganization: (id: string) =>
    apiClient
      .get<{
        organization: Organization;
        owner?: OrganizationOwnerSummary | null;
        firstVisitPayment?: OwnerFirstVisitPayment;
      }>(`/owner/organizations/${id}`)
      .then((r) => r.data),
  updateOrganization: (id: string, data: Partial<Organization>) =>
    apiClient.patch<{ organization: Organization }>(`/owner/organizations/${id}`, data).then((r) => r.data),
  deactivateOrganization: (id: string) =>
    apiClient.patch<{ organization: Organization }>(`/owner/organizations/${id}/deactivate`).then((r) => r.data),
  impersonateOwner: (id: string) =>
    apiClient.post<ImpersonateOwnerResponse>(`/owner/organizations/${id}/impersonate`).then((r) => r.data),
  inviteOrgOwner: (id: string, data: InviteOrgOwnerInput) =>
    apiClient
      .post<{ owner: OrganizationOwnerSummary; emailSent?: boolean }>(
        `/owner/organizations/${id}/invite-owner`,
        data,
      )
      .then((r) => r.data),
  getSettings: (id: string) =>
    apiClient
      .get<{ settings: OrganizationSettings; smsSendingEnabled?: boolean }>(`/owner/organizations/${id}/settings`)
      .then((r) => r.data),
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
    data: Partial<
      Pick<
        PlatformTrialSettings,
        | 'referralDurationDays'
        | 'referralPaymentMode'
        | 'referralLockedTier'
        | 'businessCardCampaignId'
      >
    >,
  ) => apiClient.patch<{ settings: PlatformTrialSettings }>('/owner/trials/settings', data).then((r) => r.data),

  listSupportTickets: (params?: {
    status?: SupportTicketStatus;
    organizationId?: string;
    type?: SupportTicketType;
  }) => apiClient.get<{ tickets: SupportTicket[] }>('/owner/support-tickets', { params }).then((r) => r.data),
  /** Pure Linear project issues not already mirrored onto Viselle Inbox tickets. */
  listLinearInboxBacklog: () =>
    apiClient
      .get<{ issues: InboxLinearIssue[]; linearSyncConfigured: boolean }>(
        '/owner/support-tickets/linear-backlog',
      )
      .then((r) => r.data),
  getSupportTicket: (ticketId: string) =>
    apiClient
      .get<{ ticket: SupportTicket; messages: SupportTicketMessage[] }>(`/owner/support-tickets/${ticketId}`)
      .then((r) => r.data),
  updateSupportTicketStatus: (ticketId: string, status: SupportTicketStatus) =>
    apiClient
      .patch<{ ticket: SupportTicket }>(`/owner/support-tickets/${ticketId}`, { status })
      .then((r) => r.data),
  prepareSupportTicketAgentBrief: (data: { ticketIds?: string[]; linearIssueIds?: string[] }) =>
    apiClient
      .post<SupportTicketAgentBrief>('/owner/support-tickets/agent-brief', data)
      .then((r) => r.data),
  replySupportTicket: (
    ticketId: string,
    data: { body: string; isInternalNote?: boolean; attachments?: SupportAttachmentUpload[] },
  ) =>
    apiClient
      .post<{ message: SupportTicketMessage }>(`/owner/support-tickets/${ticketId}/messages`, data)
      .then((r) => r.data),

  listCustomWebsiteRequests: (params?: { status?: CustomWebsiteRequestStatus; organizationId?: string }) =>
    apiClient
      .get<{ requests: CustomWebsiteRequest[] }>('/owner/custom-website-requests', { params })
      .then((r) => r.data),
  createCustomWebsiteRequest: (data: {
    businessName: string;
    contactName: string;
    contactEmail: string;
    organizationId?: string | null;
  }) =>
    apiClient
      .post<{ request: CustomWebsiteRequest }>('/owner/custom-website-requests', data)
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
  createTicket: (data: {
    subject: string;
    body: string;
    type: SupportTicketType;
    attachments?: SupportAttachmentUpload[];
  }) => apiClient.post<{ ticket: SupportTicket }>('/support-tickets', data).then((r) => r.data),
  listMyTickets: (params?: { type?: SupportTicketType }) =>
    apiClient.get<{ tickets: SupportTicket[] }>('/support-tickets', { params }).then((r) => r.data),
  getMyTicket: (ticketId: string) =>
    apiClient
      .get<{ ticket: SupportTicket; messages: SupportTicketMessage[] }>(`/support-tickets/${ticketId}`)
      .then((r) => r.data),
  replyToTicket: (ticketId: string, data: { body: string; attachments?: SupportAttachmentUpload[] }) =>
    apiClient
      .post<{ message: SupportTicketMessage }>(`/support-tickets/${ticketId}/messages`, data)
      .then((r) => r.data),
};

export const orgApi = {
  getOrganization: (orgId: string) =>
    apiClient
      .get<{
        organization: Organization;
        owner?: OrganizationOwnerSummary | null;
        firstVisitPayment?: OwnerFirstVisitPayment;
      }>(`/organizations/${orgId}`)
      .then((r) => r.data),
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
  updateOrganization: (
    orgId: string,
    data: Pick<
      Partial<Organization>,
      | 'name'
      | 'slug'
      | 'publicBookingEnabled'
      | 'batchCheckoutEnabled'
      | 'emailRemindersOptIn'
      | 'smsRemindersOptIn'
      | 'emailReminderHoursBefore'
      | 'smsReminderHoursBefore'
      | 'confirmationRequestsOptIn'
      | 'confirmationDaysBefore'
      | 'staffEmailRemindersOptIn'
      | 'staffSmsRemindersOptIn'
      | 'staffPushRemindersOptIn'
      | 'staffReminderHoursBefore'
      | 'lowStockAlertsOptIn'
      | 'lowStockAlertEmail'
      | 'lowStockAlertSms'
      | 'lowStockAlertPush'
      | 'city'
      | 'address'
      | 'phone'
    > & {
      firstVisitPaymentMode?: FirstVisitPaymentMode;
      firstVisitDepositCents?: number | null;
    },
  ) =>
    apiClient
      .patch<{ organization: Organization; firstVisitPayment?: OwnerFirstVisitPayment }>(
        `/organizations/${orgId}`,
        data,
      )
      .then((r) => r.data),
  deleteOrganization: (orgId: string) =>
    apiClient.delete<LeaveOrDeleteOrgResponse>(`/organizations/${orgId}`).then((r) => r.data),
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
    apiClient
      .post<{ account: Account; emailSent?: boolean }>(`/organizations/${orgId}/accounts`, data)
      .then((r) => r.data),
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
  getCustomer: (orgId: string, customerId: string) =>
    apiClient.get<{ customer: Customer }>(`/organizations/${orgId}/customers/${customerId}`).then((r) => r.data),

  getRevenueReport: (
    orgId: string,
    params?: { granularity?: RevenueGranularity; from?: string; to?: string; scope?: 'org' | 'mine' },
  ) =>
    apiClient.get<RevenueReport>(`/organizations/${orgId}/reports/revenue`, { params }).then((r) => r.data),
  updateCustomer: (
    orgId: string,
    customerId: string,
    data: Partial<Pick<Customer, 'firstName' | 'lastName' | 'email' | 'phone'>>,
  ) =>
    apiClient
      .patch<{ customer: Customer }>(`/organizations/${orgId}/customers/${customerId}`, data)
      .then((r) => r.data),
  listCustomerServiceNotes: (orgId: string, customerId: string, serviceId?: string) =>
    apiClient
      .get<{ notes: CustomerServiceNote[] }>(`/organizations/${orgId}/customers/${customerId}/service-notes`, {
        params: serviceId ? { serviceId } : undefined,
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
      stockCapacity?: number;
      lowStockAlertPercent?: number;
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

  previewCheckout: (
    orgId: string,
    appointmentId: string,
    data: { lines: CheckoutLineInput[]; tipCents: number; giftCardCode?: string },
    signal?: AbortSignal,
  ) =>
    apiClient
      .post<CheckoutPreview>(
        `/organizations/${orgId}/appointments/${appointmentId}/checkout/preview`,
        data,
        { signal },
      )
      .then((r) => r.data),
  checkoutCash: (
    orgId: string,
    appointmentId: string,
    data: { lines: CheckoutLineInput[]; tipCents: number; giftCardCode?: string },
  ) =>
    apiClient
      .post<{ sale: { id: string } }>(`/organizations/${orgId}/appointments/${appointmentId}/checkout/cash`, data)
      .then((r) => r.data),
  checkoutCard: (
    orgId: string,
    appointmentId: string,
    data: { lines: CheckoutLineInput[]; tipCents: number; giftCardCode?: string; mode?: 'terminal' | 'online' },
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
      .post<{ confirmed: true; saleIds?: string[] }>(
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
      .post<{ confirmed: true; saleIds?: string[] }>(`/organizations/${orgId}/checkout/batch/card/confirm`, {
        paymentIntentId,
      })
      .then((r) => r.data),

  deliverReceipt: (
    orgId: string,
    data: {
      saleIds: string[];
      customerChannel: ReceiptChannel;
      destination?: string;
      printerConfigured?: boolean;
      stripeReaderId?: string;
    },
    signal?: AbortSignal,
  ) =>
    apiClient
      .post<DeliverReceiptResult>(`/organizations/${orgId}/receipts`, data, { signal })
      .then((r) => r.data),

  sendInvoice: (
    orgId: string,
    data: {
      appointmentId?: string;
      saleId?: string;
      status: InvoiceStatus;
      channel: 'email' | 'sms';
      destination?: string;
    },
    signal?: AbortSignal,
  ) =>
    apiClient
      .post<SendInvoiceResult>(`/organizations/${orgId}/invoices`, data, { signal })
      .then((r) => r.data),

  getPublicInvoice: (token: string) =>
    apiClient.get<PublicInvoiceView>(`/public/invoices/${token}`).then((r) => r.data),
  startPublicInvoicePay: (token: string) =>
    apiClient
      .post<{
        paymentIntentId: string;
        clientSecret: string;
        stripeAccountId: string;
        publishableKey: string | null;
      }>(`/public/invoices/${token}/pay`)
      .then((r) => r.data),
  confirmPublicInvoicePay: (token: string, paymentIntentId: string) =>
    apiClient
      .post<{ invoice: { id: string; status: InvoiceStatus } }>(`/public/invoices/${token}/confirm`, {
        paymentIntentId,
      })
      .then((r) => r.data),

  getStripeConnectStatus: (orgId: string) =>
    apiClient.get<StripeConnectStatus>(`/organizations/${orgId}/stripe-connect/status`).then((r) => r.data),
  startStripeConnectOnboarding: (orgId: string, signal?: AbortSignal) =>
    apiClient
      .post<{ url: string; accountId: string }>(`/organizations/${orgId}/stripe-connect/onboard`, undefined, {
        signal,
      })
      .then((r) => r.data),
  syncStripeConnectStatus: (orgId: string) =>
    apiClient.post<{ chargesEnabled: boolean; onboardingComplete: boolean }>(`/organizations/${orgId}/stripe-connect/sync`).then((r) => r.data),
  getTerminalConnectionToken: (orgId: string) =>
    apiClient.post<{ secret: string }>(`/organizations/${orgId}/stripe-connect/terminal/connection-token`).then((r) => r.data),
  registerTerminalReader: (orgId: string, data: { registrationCode: string; label?: string }) =>
    apiClient.post<{ readerId: string; label: string }>(`/organizations/${orgId}/stripe-connect/terminal/register-reader`, data).then((r) => r.data),

  getHomepageLayout: (orgId: string) =>
    apiClient.get<{ blocks: HomepageBlock[] }>(`/organizations/${orgId}/homepage-layout`).then((r) => r.data),
  saveHomepageLayout: (orgId: string, blocks: HomepageBlock[]) =>
    apiClient.put<{ blocks: HomepageBlock[] }>(`/organizations/${orgId}/homepage-layout`, { blocks }).then((r) => r.data),

  listForms: (orgId: string) =>
    apiClient.get<{ forms: OrgForm[] }>(`/organizations/${orgId}/forms`).then((r) => r.data),
  getForm: (orgId: string, formId: string) =>
    apiClient.get<{ form: OrgForm }>(`/organizations/${orgId}/forms/${formId}`).then((r) => r.data),
  createForm: (orgId: string, data: { name: string; description?: string; schema?: FormioSchema }) =>
    apiClient.post<{ form: OrgForm }>(`/organizations/${orgId}/forms`, data).then((r) => r.data),
  updateForm: (
    orgId: string,
    formId: string,
    data: {
      name?: string;
      description?: string | null;
      schema?: FormioSchema;
      status?: OrgFormStatus;
      visibility?: OrgFormVisibility;
    },
    signal?: AbortSignal,
  ) =>
    apiClient
      .patch<{ form: OrgForm }>(`/organizations/${orgId}/forms/${formId}`, data, { signal })
      .then((r) => r.data),
  duplicateForm: (orgId: string, formId: string) =>
    apiClient.post<{ form: OrgForm }>(`/organizations/${orgId}/forms/${formId}/duplicate`).then((r) => r.data),
  listFormVersions: (orgId: string, formId: string) =>
    apiClient.get<{ versions: OrgFormVersion[] }>(`/organizations/${orgId}/forms/${formId}/versions`).then((r) => r.data),
  restoreFormVersion: (orgId: string, formId: string, versionNumber: number) =>
    apiClient
      .post<{ form: OrgForm }>(`/organizations/${orgId}/forms/${formId}/versions/${versionNumber}/restore`)
      .then((r) => r.data),
  deleteForm: (orgId: string, formId: string) =>
    apiClient.delete(`/organizations/${orgId}/forms/${formId}`).then((r) => r.data),
  listFormSubmissions: (orgId: string, formId?: string) =>
    apiClient
      .get<{ submissions: OrgFormSubmission[] }>(`/organizations/${orgId}/form-submissions`, {
        params: formId ? { formId } : undefined,
      })
      .then((r) => r.data),
  submitForm: (
    orgId: string,
    formId: string,
    data: { data: Record<string, unknown>; customerId?: string; appointmentId?: string },
  ) =>
    apiClient
      .post<{ submission: OrgFormSubmission }>(`/organizations/${orgId}/forms/${formId}/submissions`, data)
      .then((r) => r.data),
  getFormSubmission: (orgId: string, formId: string, submissionId: string) =>
    apiClient
      .get<{ submission: OrgFormSubmission }>(`/organizations/${orgId}/forms/${formId}/submissions/${submissionId}`)
      .then((r) => r.data),
  updateFormSubmission: (
    orgId: string,
    formId: string,
    submissionId: string,
    data: { data?: Record<string, unknown>; customerId?: string | null },
  ) =>
    apiClient
      .patch<{ submission: OrgFormSubmission }>(
        `/organizations/${orgId}/forms/${formId}/submissions/${submissionId}`,
        data,
      )
      .then((r) => r.data),
  getPublicForm: (shareToken: string) =>
    apiClient.get<{ form: PublicOrgForm }>(`/public/forms/${shareToken}`).then((r) => r.data),
  submitPublicForm: (shareToken: string, data: { data: Record<string, unknown> }) =>
    apiClient
      .post<{ submission: OrgFormSubmission }>(`/public/forms/${shareToken}/submissions`, data)
      .then((r) => r.data),

  listWaitlist: (orgId: string) =>
    apiClient.get<{ entries: WaitlistEntry[] }>(`/organizations/${orgId}/waitlist`).then((r) => r.data),
  addWaitlist: (
    orgId: string,
    data: { customerId: string; serviceId?: string; accountId?: string; preferredDate?: string; notes?: string },
  ) => apiClient.post<{ entry: WaitlistEntry }>(`/organizations/${orgId}/waitlist`, data).then((r) => r.data),
  updateWaitlist: (orgId: string, entryId: string, data: { status?: WaitlistStatus; notes?: string | null }) =>
    apiClient.patch<{ entry: WaitlistEntry }>(`/organizations/${orgId}/waitlist/${entryId}`, data).then((r) => r.data),

  listGiftCards: (orgId: string) =>
    apiClient.get<{ giftCards: GiftCard[] }>(`/organizations/${orgId}/gift-cards`).then((r) => r.data),
  createGiftCard: (
    orgId: string,
    data: { amountCents: number; creditCents?: number; code?: string },
  ) => apiClient.post<{ giftCard: GiftCard }>(`/organizations/${orgId}/gift-cards`, data).then((r) => r.data),
  lookupGiftCard: (orgId: string, data: { code: string }, signal?: AbortSignal) =>
    apiClient
      .post<{ giftCard: GiftCard }>(`/organizations/${orgId}/gift-cards/lookup`, data, { signal })
      .then((r) => r.data),
  redeemGiftCard: (orgId: string, data: { code: string; amountCents: number }) =>
    apiClient.post<{ giftCard: GiftCard }>(`/organizations/${orgId}/gift-cards/redeem`, data).then((r) => r.data),
  voidGiftCard: (orgId: string, giftCardId: string) =>
    apiClient.post<{ giftCard: GiftCard }>(`/organizations/${orgId}/gift-cards/${giftCardId}/void`).then((r) => r.data),

  listPackages: (orgId: string) =>
    apiClient.get<{ packages: ServicePackage[] }>(`/organizations/${orgId}/packages`).then((r) => r.data),
  createPackage: (
    orgId: string,
    data: { name: string; serviceId?: string; creditCents: number; priceCents: number },
  ) => apiClient.post<{ package: ServicePackage }>(`/organizations/${orgId}/packages`, data).then((r) => r.data),
  updatePackage: (orgId: string, packageId: string, data: Partial<ServicePackage>) =>
    apiClient.patch<{ package: ServicePackage }>(`/organizations/${orgId}/packages/${packageId}`, data).then((r) => r.data),
  listCustomerPackages: (orgId: string) =>
    apiClient
      .get<{ customerPackages: CustomerPackage[] }>(`/organizations/${orgId}/customer-packages`)
      .then((r) => r.data),
  sellPackage: (orgId: string, data: { packageId: string; customerId: string }) =>
    apiClient
      .post<{ customerPackage: CustomerPackage }>(`/organizations/${orgId}/customer-packages`, data)
      .then((r) => r.data),
  usePackageCredits: (orgId: string, customerPackageId: string, data: { amountCents: number }) =>
    apiClient
      .post<{ customerPackage: CustomerPackage }>(
        `/organizations/${orgId}/customer-packages/${customerPackageId}/use-credits`,
        data,
      )
      .then((r) => r.data),
  usePackageVisit: (orgId: string, customerPackageId: string, data?: { amountCents: number }) =>
    apiClient
      .post<{ customerPackage: CustomerPackage }>(
        `/organizations/${orgId}/customer-packages/${customerPackageId}/use-credits`,
        data ?? { amountCents: 100 },
      )
      .then((r) => r.data),

  listMembershipPlans: (orgId: string) =>
    apiClient.get<{ plans: MembershipPlan[] }>(`/organizations/${orgId}/membership-plans`).then((r) => r.data),
  createMembershipPlan: (
    orgId: string,
    data: { name: string; priceCents: number; interval?: 'month' | 'year'; visitsIncluded?: number | null },
  ) => apiClient.post<{ plan: MembershipPlan }>(`/organizations/${orgId}/membership-plans`, data).then((r) => r.data),
  updateMembershipPlan: (orgId: string, planId: string, data: Partial<MembershipPlan>) =>
    apiClient
      .patch<{ plan: MembershipPlan }>(`/organizations/${orgId}/membership-plans/${planId}`, data)
      .then((r) => r.data),
  listMemberships: (orgId: string) =>
    apiClient.get<{ memberships: CustomerMembership[] }>(`/organizations/${orgId}/memberships`).then((r) => r.data),
  subscribeMembership: (orgId: string, data: { planId: string; customerId: string; nextBillOn: string }) =>
    apiClient.post<{ membership: CustomerMembership }>(`/organizations/${orgId}/memberships`, data).then((r) => r.data),
  updateMembership: (
    orgId: string,
    membershipId: string,
    data: { status?: CustomerMembershipStatus; nextBillOn?: string },
  ) =>
    apiClient
      .patch<{ membership: CustomerMembership }>(`/organizations/${orgId}/memberships/${membershipId}`, data)
      .then((r) => r.data),
  recordMembershipBill: (orgId: string, membershipId: string) =>
    apiClient
      .post<{ membership: CustomerMembership }>(`/organizations/${orgId}/memberships/${membershipId}/record-bill`)
      .then((r) => r.data),

  getCommissions: (orgId: string, params: { from: string; to: string }) =>
    apiClient.get<CommissionReport>(`/organizations/${orgId}/commissions`, { params }).then((r) => r.data),

  getStaffPayoutSettings: (orgId: string) =>
    apiClient.get<StaffPayoutSettings>(`/organizations/${orgId}/staff-payouts/settings`).then((r) => r.data),
  updateStaffPayoutSettings: (
    orgId: string,
    data: Partial<Pick<StaffPayoutSettings, 'mode' | 'schedule' | 'includeCommission' | 'includeTips'>>,
  ) =>
    apiClient
      .patch<StaffPayoutSettings>(`/organizations/${orgId}/staff-payouts/settings`, data)
      .then((r) => r.data),
  startStaffPayoutOnboarding: (orgId: string, accountId: string, signal?: AbortSignal) =>
    apiClient
      .post<{ url: string; accountId: string }>(
        `/organizations/${orgId}/staff-payouts/recipients/${accountId}/onboard`,
        undefined,
        { signal },
      )
      .then((r) => r.data),
  syncStaffPayoutRecipient: (orgId: string, accountId: string) =>
    apiClient
      .post<{ onboardingComplete: boolean; payoutsReady: boolean }>(
        `/organizations/${orgId}/staff-payouts/recipients/${accountId}/sync`,
      )
      .then((r) => r.data),
  previewStaffPayouts: (orgId: string, params: { from: string; to: string }) =>
    apiClient
      .get<StaffPayoutPreview>(`/organizations/${orgId}/staff-payouts/preview`, { params })
      .then((r) => r.data),
  sendStaffPayouts: (orgId: string, data: { from: string; to: string }) =>
    apiClient
      .post<{ from: string; to: string; rows: StaffPayoutPreviewRow[] }>(
        `/organizations/${orgId}/staff-payouts/send`,
        data,
      )
      .then((r) => r.data),
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

export const pushApi = {
  getVapidPublicKey: () =>
    apiClient.get<{ publicKey: string }>('/push/vapid-public-key').then((r) => r.data),
  getStatus: () =>
    apiClient
      .get<{
        configured: boolean;
        subscriptionCount: number;
        subscriptions: Array<{
          id: string;
          endpointHost: string;
          userAgent: string | null;
          createdAt: string;
        }>;
      }>('/push/status')
      .then((r) => r.data),
  subscribe: (data: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  }) => apiClient.post('/push/subscriptions', data).then((r) => r.data),
  unsubscribe: (endpoint: string) =>
    apiClient.delete('/push/subscriptions', { data: { endpoint } }).then((r) => r.data),
  sendTest: () => apiClient.post<{ sent: number; targetUserId: string }>('/push/test').then((r) => r.data),
  adminSendTest: (data?: { email?: string; title?: string; body?: string }) =>
    apiClient
      .post<{
        sent: number;
        subscriptionCount: number;
        targetUserId: string;
        targetEmail: string;
      }>('/push/admin-test', data ?? {})
      .then((r) => r.data),
};
