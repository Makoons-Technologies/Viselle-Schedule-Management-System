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
  /** Set when this session is a platform_owner impersonating an org_owner. */
  impersonatedBy?: string | null;
  impersonatedByEmail?: string | null;
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

/** Result of leave-organization or owner self-delete. */
export type LeaveOrDeleteOrgResponse =
  | { outcome: 'switched'; token: string; user: AuthUser; memberships?: StaffMembership[] }
  | { outcome: 'logged_out' };

export interface ImpersonateOwnerResponse {
  token: string;
  user: AuthUser;
  organization: { id: string; name: string };
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
  confirmationRequestsOptIn: boolean;
  confirmationDaysBefore: number;
  staffEmailRemindersOptIn?: boolean;
  staffSmsRemindersOptIn?: boolean;
  staffPushRemindersOptIn?: boolean;
  staffReminderHoursBefore?: number;
  lowStockAlertsOptIn?: boolean;
  lowStockAlertEmail?: boolean;
  lowStockAlertSms?: boolean;
  lowStockAlertPush?: boolean;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  trialEndsAt?: string | null;
  trialCampaignId?: string | null;
  referredByOrganizationId?: string | null;
  referralCode?: string | null;
  /** Seed / QA tenant — listed under Dev accounts on the platform. */
  isDev?: boolean;
  createdAt: string;
  updatedAt: string;
  /** Present on GET /owner/organizations */
  hostingMode?: WebsiteHostingMode;
  /** Present on GET /owner/organizations — custom website build requested at signup */
  customWebsiteRequested?: boolean;
  /** Present on GET /owner/organizations — true when an org_owner user exists */
  hasOwner?: boolean;
}

export interface OrganizationOwnerSummary {
  email: string;
  status: 'active' | 'inactive' | 'deleted';
  /** True when invited but password setup is not finished. */
  setupPending: boolean;
}

export type TrialCampaignType = 'code' | 'homepage';
export type TrialPaymentMode = 'stripe_trial' | 'free_no_card';
/** Plan locked for signup when this trial/campaign/referral offer applies. */
export type TrialLockedTier = 'starter' | 'professional' | 'business';

export interface TrialCampaign {
  id: string;
  name: string;
  type: TrialCampaignType;
  code?: string | null;
  durationDays: number;
  maxRedemptions?: number | null;
  redemptionCount: number;
  paymentMode: TrialPaymentMode;
  /** Signup plan locked while this campaign offer applies. */
  lockedTier: TrialLockedTier;
  enabled: boolean;
  /** Null = campaign never expires (unlimited duration). */
  expiresAt?: string | null;
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
  /** Signup plan locked when a referral trial offer applies. */
  referralLockedTier: TrialLockedTier;
  /** Code-type campaign shown on `/business-card`. Null = unassigned. */
  businessCardCampaignId: string | null;
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
      lockedTier: TrialLockedTier;
      code?: string | null;
    }
  | {
      kind: 'referral';
      referredByOrganizationId: string;
      referringOrgName: string;
      durationDays: number;
      paymentMode: TrialPaymentMode;
      lockedTier: TrialLockedTier;
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
  /** Platform SaaS subscription (signup/upgrade Checkout), not Connect. */
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgPlanFeatures {
  subscriptionTier: SubscriptionTier | null;
  tierName: string;
  smsRemindersEnabled: boolean;
  /** False while the platform sending number is under A2P / carrier review. */
  smsSendingEnabled?: boolean;
  emailRemindersEnabled: boolean;
  recurringAppointmentsEnabled: boolean;
  maxStaffAccounts: number;
  monthlyPriceCents: number;
  subdomainHostingEnabled: boolean;
  /** True when a platform SaaS Stripe subscription id is stored (proration path). */
  hasStripeSubscription: boolean;
}

export interface PlatformStats {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  inactiveOrganizations: number;
  billingActiveOrganizations: number;
  devOrganizations: number;
  organizationsByTier: Record<SubscriptionTier, number>;
  estimatedMrrCents: number;
}

export type RevenueGranularity = 'day' | 'week' | 'month';

export interface RevenuePoint {
  /** Bucket start date (YYYY-MM-DD). For "week" this is the Monday of that week. */
  period: string;
  revenueCents: number;
  salesCount: number;
}

/**
 * "Revenue" is the sum of paid sale totals (subtotal + tip) for sales with a
 * succeeded payment. There is no cost-of-goods-sold data in the system, so
 * this is presented as a revenue/profit approximation rather than true profit.
 */
export interface RevenueReport {
  metric: 'revenue';
  granularity: RevenueGranularity;
  from: string;
  to: string;
  series: RevenuePoint[];
  totalRevenueCents: number;
  totalSalesCount: number;
}

export type MrrGranularity = 'day' | 'week' | 'month';

export interface MrrPoint {
  /** Bucket start date (YYYY-MM-DD). For "week" this is the Monday of that week. */
  period: string;
  /** Estimated platform MRR as of the end of this bucket (cumulative). */
  mrrCents: number;
  /** Estimated MRR contributed by organizations that signed up within this bucket. */
  newMrrCents: number;
  /** Count of organizations that signed up within this bucket. */
  newOrganizationsCount: number;
}

/**
 * Estimated Monthly Recurring Revenue trend: each organization is assumed to
 * contribute its *current* subscription price from its signup date onward
 * (there's no historical billing ledger), so this is an approximation that
 * matches today's "Est. MRR" figure exactly at the most recent point.
 */
export interface MrrReport {
  metric: 'mrr';
  granularity: MrrGranularity;
  from: string;
  to: string;
  series: MrrPoint[];
  currentMrrCents: number;
  totalNewOrganizationsCount: number;
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
  smsOptInAt?: string | null;
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

export interface CustomerServiceNote {
  id: string;
  organizationId: string;
  customerId: string;
  serviceId: string;
  body: string;
  sourceAppointmentId?: string | null;
  createdByAccountId?: string | null;
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
  stockCapacity?: number | null;
  lowStockAlertPercent?: number | null;
  lowStockNotifiedAt?: string | null;
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
  purpose?: 'reminder' | 'confirmation_request';
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
  subdomain?: string | null;
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
  subdomainUrl: string;
  defaultSubdomain: string;
  effectiveSubdomain: string;
  subdomainHostingEnabled: boolean;
  publicApiBaseUrl: string;
  organizationSlug: string;
  organizationName: string;
  publicBookingEnabled: boolean;
  apiAccess: {
    apiKeyConfigured: boolean;
    apiKeyPrefix: string | null;
    allowedOrigins: string[];
  };
}

export interface SubdomainAvailability {
  subdomain: string;
  available: boolean;
  reason?: 'invalid' | 'reserved' | 'taken';
  suggestion?: string;
}

export interface UpdateWebsiteInput {
  hostingMode?: WebsiteHostingMode;
  siteTemplate?: SiteTemplate | null;
  subdomain?: string | null;
  allowedOrigins?: string[];
  /** Public marketing/booking URL when hostingMode is external_api. */
  deployedSiteUrl?: string | null;
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
  customerServiceNotes?: CustomerServiceNote[];
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
  smsOptIn?: boolean;
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
  /** Optional — not used by platform create; signup may still send a tier. */
  tier?: Exclude<SubscriptionTier, 'custom'>;
  monthlyPriceCents?: number;
  /** Optional trial campaign; omit/null = no trial (owner chooses plan on first login). */
  trialCampaignId?: string | null;
  ownerEmail: string;
  /** When true, org is tagged as a dev/test account. */
  isDev?: boolean;
}

export interface InviteOrgOwnerInput {
  email: string;
}

/** Aligned with Linear: Open → In Progress → In Review → Done. */
export type SupportTicketStatus = 'open' | 'in_progress' | 'in_review' | 'done' | 'canceled';
export type SupportTicketType = 'support' | 'feature_request' | 'bug';

export interface SupportTicket {
  id: string;
  organizationId?: string | null;
  createdByUserId?: string | null;
  creatorEmail: string;
  creatorRole: UserRole;
  type: SupportTicketType;
  subject: string;
  body: string;
  status: SupportTicketStatus;
  linearIssueId?: string | null;
  linearIssueIdentifier?: string | null;
  linearIssueUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: SupportTicketAttachment[];
}

/** Pure Linear project issue (not submitted via Viselle Inbox). */
export interface InboxLinearIssue {
  source: 'linear';
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  url: string;
  stateName: string;
  updatedAt: string;
}

export interface SupportTicketAgentBrief {
  prompt: string;
  tickets: SupportTicket[];
  linearIssues?: InboxLinearIssue[];
  linearSyncConfigured: boolean;
  linearSynced: boolean;
  statusLabels: Record<SupportTicketStatus, string>;
  instructions: string[];
}

export interface SupportTicketAttachment {
  id: string;
  ticketId: string;
  messageId?: string | null;
  uploaderUserId?: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
  url?: string;
}

export interface SupportAttachmentUpload {
  fileName: string;
  contentType: string;
  dataBase64: string;
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  authorUserId?: string | null;
  authorEmail: string;
  isInternalNote: boolean;
  body: string;
  createdAt: string;
  attachments?: SupportTicketAttachment[];
}

export type CustomWebsiteRequestStatus = 'open' | 'in_progress' | 'done' | 'closed';
export type CustomWebsiteRequestSource = 'signup' | 'backfill' | 'manual';

export interface CustomWebsiteRequest {
  id: string;
  organizationId?: string | null;
  pendingSignupId?: string | null;
  contactName: string;
  contactEmail: string;
  businessName: string;
  status: CustomWebsiteRequestStatus;
  source: CustomWebsiteRequestSource;
  createdAt: string;
  updatedAt: string;
}

export interface CustomWebsiteRequestNote {
  id: string;
  requestId: string;
  authorUserId?: string | null;
  authorEmail: string;
  body: string;
  createdAt: string;
}
