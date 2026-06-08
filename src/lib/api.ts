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
  CreateServiceInput,
  Customer,
  LoginResponse,
  Organization,
  OrganizationSettings,
  RecurringAppointmentRule,
  RecurringFrequency,
  Reminder,
  ReminderType,
  ScheduleResponse,
  Service,
  WebsiteSettingsResponse,
  UpdateWebsiteInput,
} from '@/types/api';

const TOKEN_KEY = 'viselle_auth_token';

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
      error.message || 'Network request failed',
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

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),
  me: () => apiClient.get<AuthUser>('/auth/me').then((r) => r.data),
};

export const ownerApi = {
  listOrganizations: () =>
    apiClient.get<{ organizations: Organization[] }>('/owner/organizations').then((r) => r.data),
  createOrganization: (data: CreateOrganizationInput) =>
    apiClient.post<{ organization: Organization; settings: OrganizationSettings }>(
      '/owner/organizations',
      data,
    ).then((r) => r.data),
  getOrganization: (id: string) =>
    apiClient.get<{ organization: Organization }>(`/owner/organizations/${id}`).then((r) => r.data),
  updateOrganization: (id: string, data: Partial<Organization>) =>
    apiClient.patch<{ organization: Organization }>(`/owner/organizations/${id}`, data).then((r) => r.data),
  deactivateOrganization: (id: string) =>
    apiClient.patch<{ organization: Organization }>(`/owner/organizations/${id}/deactivate`).then((r) => r.data),
  getSettings: (id: string) =>
    apiClient.get<{ settings: OrganizationSettings }>(`/owner/organizations/${id}/settings`).then((r) => r.data),
  updateSettings: (id: string, data: Partial<OrganizationSettings>) =>
    apiClient.patch<{ settings: OrganizationSettings }>(`/owner/organizations/${id}/settings`, data).then((r) => r.data),
  getBilling: (id: string) =>
    apiClient.get<{ billing: BillingInfo }>(`/owner/organizations/${id}/billing`).then((r) => r.data),
  updateBilling: (id: string, data: Partial<BillingInfo>) =>
    apiClient.patch<{ organization: Organization }>(`/owner/organizations/${id}/billing`, data).then((r) => r.data),
  getWebsite: (id: string) =>
    apiClient.get<WebsiteSettingsResponse>(`/owner/organizations/${id}/website`).then((r) => r.data),
  updateWebsite: (id: string, data: UpdateWebsiteInput) =>
    apiClient.patch<WebsiteSettingsResponse>(`/owner/organizations/${id}/website`, data).then((r) => r.data),
  regenerateWebsiteApiKey: (id: string) =>
    apiClient
      .post<WebsiteSettingsResponse & { apiKey: string }>(`/owner/organizations/${id}/website/regenerate-api-key`)
      .then((r) => r.data),
};

export const orgApi = {
  getOrganization: (orgId: string) =>
    apiClient.get<{ organization: Organization }>(`/organizations/${orgId}`).then((r) => r.data),
  updateOrganization: (orgId: string, data: Pick<Partial<Organization>, 'name' | 'publicBookingEnabled'>) =>
    apiClient.patch<{ organization: Organization }>(`/organizations/${orgId}`, data).then((r) => r.data),
  getWebsite: (orgId: string) =>
    apiClient.get<WebsiteSettingsResponse>(`/organizations/${orgId}/website`).then((r) => r.data),
  updateWebsite: (orgId: string, data: UpdateWebsiteInput) =>
    apiClient.patch<WebsiteSettingsResponse>(`/organizations/${orgId}/website`, data).then((r) => r.data),
  regenerateWebsiteApiKey: (orgId: string) =>
    apiClient
      .post<WebsiteSettingsResponse & { apiKey: string }>(`/organizations/${orgId}/website/regenerate-api-key`)
      .then((r) => r.data),

  listAccounts: (orgId: string) =>
    apiClient.get<{ accounts: Account[] }>(`/organizations/${orgId}/accounts`).then((r) => r.data),
  createAccount: (orgId: string, data: CreateAccountInput) =>
    apiClient.post<{ account: Account }>(`/organizations/${orgId}/accounts`, data).then((r) => r.data),
  updateAccount: (orgId: string, accountId: string, data: Partial<CreateAccountInput & { status: string }>) =>
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
    apiClient.post(`/organizations/${orgId}/appointments`, data).then((r) => r.data),
  updateAppointment: (orgId: string, appointmentId: string, data: Partial<Appointment>) =>
    apiClient.patch<{ appointment: Appointment }>(`/organizations/${orgId}/appointments/${appointmentId}`, data).then((r) => r.data),
  cancelAppointment: (orgId: string, appointmentId: string, reason?: string) =>
    apiClient.patch<{ appointment: Appointment }>(`/organizations/${orgId}/appointments/${appointmentId}/cancel`, { reason }).then((r) => r.data),
  makeAppointmentRecurring: (
    orgId: string,
    appointmentId: string,
    data: { frequency: RecurringFrequency; interval: number; endDate?: string },
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
};

export const appointmentApi = {
  getInfo: (appointmentId: string) =>
    apiClient.get<AppointmentInfo>(`/appointments/${appointmentId}/info`).then((r) => r.data),
};

export const scheduleApi = {
  mySchedule: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ScheduleResponse>('/me/schedule', { params }).then((r) => r.data),
};
