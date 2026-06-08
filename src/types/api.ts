export type UserRole = 'platform_owner' | 'org_owner' | 'staff';
export type UserStatus = 'active' | 'inactive' | 'deleted';

export type OrganizationStatus = 'active' | 'inactive' | 'suspended' | 'trial' | 'cancelled';
export type BillingStatus = 'active' | 'past_due' | 'failed' | 'cancelled' | 'trial';

export type AccountRole = 'org_owner' | 'admin' | 'staff';
export type AccountStatus = 'active' | 'inactive' | 'deleted';

export type AvailabilityExceptionType = 'available' | 'unavailable' | 'blocked';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'rescheduled';

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type RecurringRuleStatus = 'active' | 'paused' | 'cancelled';

export type ReminderType = 'sms' | 'email';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export type DeploymentStatus = 'not_started' | 'pending' | 'deployed' | 'failed' | 'disabled';

export type WebsiteHostingMode = 'none' | 'subdomain' | 'external_api';

export type SiteTemplate = 'classic' | 'modern' | 'minimal';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string | null;
  accountId?: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  billingStatus: BillingStatus;
  lastPaymentAt?: string | null;
  nextPaymentDueAt?: string | null;
  publicBookingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettings {
  id: string;
  organizationId: string;
  smsRemindersEnabled: boolean;
  emailRemindersEnabled: boolean;
  recurringAppointmentsEnabled: boolean;
  websiteHostingEnabled: boolean;
  externalApiEnabled: boolean;
  maxStaffAccounts: number;
  maxMonthlyAppointments?: number | null;
  monthlyPriceCents: number;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingInfo {
  organizationId: string;
  billingStatus: BillingStatus;
  lastPaymentAt?: string | null;
  nextPaymentDueAt?: string | null;
  monthlyPriceCents: number;
}

export interface Account {
  id: string;
  organizationId: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: AccountRole;
  status: AccountStatus;
  isBookable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceCents?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityRule {
  id: string;
  organizationId: string;
  accountId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityException {
  id: string;
  organizationId: string;
  accountId: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  type: AvailabilityExceptionType;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  organizationId: string;
  accountId: string;
  customerId: string;
  serviceId: string;
  recurringAppointmentRuleId?: string | null;
  status: AppointmentStatus;
  startTime: string;
  endTime: string;
  timezone: string;
  appointmentNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringAppointmentRule {
  id: string;
  organizationId: string;
  accountId: string;
  customerId: string;
  serviceId: string;
  frequency: RecurringFrequency;
  interval: number;
  startDate: string;
  endDate?: string | null;
  startTime: string;
  timezone: string;
  status: RecurringRuleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  organizationId: string;
  appointmentId: string;
  type: ReminderType;
  status: ReminderStatus;
  scheduledFor: string;
  sentAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteSettings {
  id: string;
  organizationId: string;
  hostingMode: WebsiteHostingMode;
  siteTemplate?: SiteTemplate | null;
  websiteHostingEnabled: boolean;
  apiKeyPrefix?: string | null;
  allowedOrigins: string[];
  uploadedZipUrl?: string | null;
  deployedSiteUrl?: string | null;
  deploymentStatus: DeploymentStatus;
  lastDeployedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteTemplateInfo {
  id: SiteTemplate;
  name: string;
  description: string;
}

export interface WebsiteSettingsResponse {
  websiteSettings: WebsiteSettings;
  siteTemplates: SiteTemplateInfo[];
  subdomainBaseDomain: string;
  publicApiBaseUrl: string;
  organizationSlug: string;
  publicBookingEnabled: boolean;
  apiAccess: {
    apiKeyConfigured: boolean;
    apiKeyPrefix: string | null;
    allowedOrigins: string[];
  };
}

export interface UpdateWebsiteInput {
  hostingMode?: WebsiteHostingMode;
  siteTemplate?: SiteTemplate | null;
  allowedOrigins?: string[];
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  accountId?: string;
  availableAccounts?: Array<{
    accountId: string;
    firstName: string;
    lastName: string;
  }>;
}

export interface ScheduleResponse {
  accountId: string;
  appointments: Appointment[];
  availabilityRules: AvailabilityRule[];
  availabilityExceptions: AvailabilityException[];
}

export interface AppointmentInfo {
  appointment: Appointment;
  organization: Organization | null;
  account: Account | null;
  service: Service | null;
  customer: Customer | null;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface CreateAppointmentInput {
  accountId: string;
  serviceId: string;
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  startTime: string;
  timezone: string;
  appointmentNotes?: string;
}

export interface CreateAccountInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: AccountRole;
  isBookable: boolean;
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents?: number;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  monthlyPriceCents: number;
}
