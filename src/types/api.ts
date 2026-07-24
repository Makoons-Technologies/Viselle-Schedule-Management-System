export type UserRole = 'platform_owner' | 'org_owner' | 'staff';
export type UserStatus = 'active' | 'inactive' | 'deleted';

export type OrganizationStatus = 'active' | 'inactive' | 'suspended' | 'trial' | 'cancelled';
export type BillingStatus = 'active' | 'past_due' | 'failed' | 'cancelled' | 'trial';

export type AccountRole = 'org_owner' | 'admin' | 'staff';
export type AccountStatus = 'active' | 'inactive' | 'deleted';

export interface StaffPermissions {
  canManageOwnSchedule: boolean;
  canCreateAppointments: boolean;
  canCancelAppointments: boolean;
  canManageVisitPayment: boolean;
  canAddCheckoutProducts: boolean;
  canBatchCheckout: boolean;
}

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  canManageOwnSchedule: true,
  canCreateAppointments: true,
  canCancelAppointments: true,
  canManageVisitPayment: true,
  canAddCheckoutProducts: true,
  canBatchCheckout: true,
};

export type AvailabilityExceptionType = 'available' | 'unavailable' | 'blocked';

export type VisitStatus = 'scheduled' | 'arrived' | 'missed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

/** @deprecated Use visitStatus + paymentStatus */
export type AppointmentStatus = VisitStatus | PaymentStatus | 'confirmed' | 'completed' | 'no_show' | 'rescheduled';

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type RecurringRuleStatus = 'active' | 'paused' | 'cancelled';

export type ReminderType = 'sms' | 'email';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export type DeploymentStatus = 'not_started' | 'pending' | 'deployed' | 'failed' | 'disabled';

export type WebsiteHostingMode = 'none' | 'path' | 'subdomain' | 'external_api';

export type SiteTemplate = 'classic' | 'modern' | 'minimal';

export interface ThemeColorPalette {
  primary?: string;
  page?: string;
  header?: string;
  headerText?: string;
  card?: string;
  text?: string;
  muted?: string;
}

export interface BookingBranding {
  themePalettes?: Partial<Record<SiteTemplate, ThemeColorPalette>>;
  backgroundImageUrl?: string | null;
  uiOpacity?: number;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

export type SubscriptionTier = 'starter' | 'professional' | 'business' | 'custom';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string | null;
  accountId?: string | null;
  memberships?: StaffMembership[];
}

export interface StaffMembership {
  organizationId: string;
  organizationName: string;
  accountId: string;
  accountRole: AccountRole;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  memberships?: StaffMembership[];
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
  batchCheckoutEnabled: boolean;
  staffCanManageOwnSchedule: boolean;
  staffCanCreateAppointments: boolean;
  staffCanCancelAppointments: boolean;
  staffCanManageVisitPayment: boolean;
  staffCanAddCheckoutProducts: boolean;
  staffCanBatchCheckout: boolean;
  emailRemindersOptIn: boolean;
  smsRemindersOptIn: boolean;
  emailReminderHoursBefore: number;
  smsReminderHoursBefore: number;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  trialEndsAt?: string | null;
  trialCampaignId?: string | null;
  referredByOrganizationId?: string | null;
  referralCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TrialCampaignType = 'code' | 'homepage';
export type TrialPaymentMode = 'stripe_trial' | 'free_no_card';

export interface TrialCampaign {
  id: string;
  name: string;
  type: TrialCampaignType;
  code?: string | null;
  durationDays: number;
  maxRedemptions?: number | null;
  redemptionCount: number;
  paymentMode: TrialPaymentMode;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrialRedemption {
  id: string;
  campaignId: string;
  organizationId: string;
  redeemedAt: string;
  organizationName: string;
  organizationSlug: string;
}

export interface PlatformTrialSettings {
  id: 'default';
  referralDurationDays: number;
  referralPaymentMode: TrialPaymentMode;
  updatedAt: string;
}

export interface ReferralStat {
  organizationId: string;
  name: string;
  slug: string;
  referralCode: string;
  attributedSignupCount: number;
}

export type ResolvedTrialOffer =
  | {
      kind: 'campaign';
      campaignId: string;
      name: string;
      durationDays: number;
      paymentMode: TrialPaymentMode;
      code?: string | null;
    }
  | {
      kind: 'referral';
      referredByOrganizationId: string;
      referringOrgName: string;
      durationDays: number;
      paymentMode: TrialPaymentMode;
    };

export interface OrganizationSettings {
  id: string;
  organizationId: string;
  subscriptionTier?: SubscriptionTier | null;
  smsRemindersEnabled: boolean;
  emailRemindersEnabled: boolean;
  recurringAppointmentsEnabled: boolean;
  websiteHostingEnabled: boolean;
  externalApiEnabled: boolean;
  subdomainHostingEnabled: boolean;
  maxStaffAccounts: number;
  maxMonthlyAppointments?: number | null;
  monthlyPriceCents: number;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgPlanFeatures {
  subscriptionTier: SubscriptionTier | null;
  tierName: string;
  smsRemindersEnabled: boolean;
  emailRemindersEnabled: boolean;
  recurringAppointmentsEnabled: boolean;
  maxStaffAccounts: number;
  monthlyPriceCents: number;
  subdomainHostingEnabled: boolean;
}

export interface PlatformStats {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  organizationsByTier: Record<SubscriptionTier, number>;
  estimatedMrrCents: number;
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
  visitStatus: VisitStatus;
  paymentStatus: PaymentStatus;
  startTime: string;
  endTime: string;
  timezone: string;
  appointmentNotes?: string | null;
  arrivedAt?: string | null;
  missedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  retailPriceCents: number;
  costCents?: number | null;
  stockQuantity: number;
  lowStockThreshold?: number | null;
  trackInventory: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StripeConnectStatus {
  accountId: string | null;
  publishableKey: string | null;
  chargesEnabled: boolean;
  onboardingComplete: boolean;
}

export interface CheckoutLineInput {
  lineType: 'service' | 'product' | 'custom';
  serviceId?: string;
  productId?: string;
  description?: string;
  quantity: number;
  unitPriceCents?: number;
}

export interface CheckoutPreview {
  lines: Array<CheckoutLineInput & { description: string; unitPriceCents: number; lineTotalCents: number }>;
  subtotalCents: number;
  tipCents: number;
  totalCents: number;
}

export interface BatchCheckoutAppointmentInput {
  appointmentId: string;
  lines: CheckoutLineInput[];
}

export interface BatchCheckoutPreview {
  appointments: Array<{
    appointmentId: string;
    customerId?: string | null;
    accountId?: string | null;
    lines: CheckoutPreview['lines'];
    subtotalCents: number;
  }>;
  subtotalCents: number;
  tipCents: number;
  totalCents: number;
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
  daysOfWeek?: number[];
  dayTimes?: Record<string, string>;
  status: RecurringRuleStatus;
  skippedDates?: string[];
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
  deployedSiteUrl?: string | null;
  deploymentStatus: DeploymentStatus;
  lastDeployedAt?: string | null;
  bookingBranding?: BookingBranding;
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
  pathBookingBaseUrl: string;
  pathBookingUrl: string;
  subdomainHostingEnabled: boolean;
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
  bookingBranding?: BookingBranding;
}

export interface UploadBookingAssetInput {
  assetType: 'logo' | 'favicon' | 'background';
  fileName: string;
  contentType: string;
  dataBase64: string;
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
  customer?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  customerId?: string;
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
  tier?: Exclude<SubscriptionTier, 'custom'>;
  monthlyPriceCents?: number;
  ownerEmail: string;
}
