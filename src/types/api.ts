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

export type ReminderType = 'sms' | 'email' | 'push';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled';
export type ReminderPurpose =
  | 'reminder'
  | 'confirmation_request'
  | 'confirmation'
  | 'update'
  | 'cancellation';
export type ReminderAudience = 'customer' | 'staff';

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

/** Public-booking first-visit no-show protection. Not POS, gift cards, or memberships. */
export type FirstVisitPaymentMode = 'off' | 'deposit' | 'card_on_file';
export type BookingPaymentMode = 'deposit' | 'card_on_file';

/** Sibling on GET/PATCH `/organizations/:id` and GET `…/stripe-connect/status`. */
export interface OwnerFirstVisitPayment {
  mode: FirstVisitPaymentMode;
  depositCents: number | null;
  stripeReady: boolean;
  stripeAccountId: string | null;
  publishableKey: string | null;
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
  /** False while production sending is paused. Staging UI treats texts as available. */
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
export type RevenueScope = 'org' | 'mine';

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
  commissionPercent?: number;
  stripeRecipientAccountId?: string | null;
  stripeRecipientOnboardingComplete?: boolean;
  stripeRecipientPayoutsReady?: boolean;
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
  /** Present when listing all notes for a customer (CRM). */
  serviceName?: string | null;
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
  firstVisitPayment?: OwnerFirstVisitPayment;
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
  giftCardAppliedCents?: number;
  giftCardCode?: string | null;
  giftCardRemainingCents?: number | null;
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
  giftCardAppliedCents?: number;
  giftCardCode?: string | null;
  giftCardRemainingCents?: number | null;
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
  purpose?: ReminderPurpose;
  audience?: ReminderAudience;
  targetUserId?: string | null;
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
  /** Included viselle.net/book/:slug page. Independent of custom website / API. Default true. */
  pathBookingEnabled?: boolean;
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
  /** Platform-provisioned Viselle custom website; org cannot change hosting or URL. */
  customWebsiteEnabled?: boolean;
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
  pathBookingEnabled?: boolean;
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
  /** Guest is here now — skip working-hours rules (overlap still blocks). */
  walkIn?: boolean;
}

export interface CreateAccountInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: AccountRole;
  isBookable: boolean;
  commissionPercent?: number;
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

export type DemoBookingStatus = 'scheduled' | 'canceled' | 'completed';

export interface DemoBooking {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  businessName?: string | null;
  notes?: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: DemoBookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DemoSlot {
  startsAt: string;
  endsAt: string;
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

export type HomepageWidgetType =
  | 'welcome'
  | 'announcement'
  | 'stats'
  | 'setup'
  | 'bookingCta'
  | 'featuredServices'
  | 'upcoming'
  | 'revenue'
  | 'form';

export type HomepageBlockType = HomepageWidgetType | string;

export interface HomepageColumn {
  width?: number;
  components: HomepageBlock[];
}

export interface HomepageTab {
  label: string;
  key?: string;
  components: HomepageBlock[];
}

export interface HomepageBlock {
  id: string;
  type: string;
  visible?: boolean;
  title?: string;
  body?: string;
  serviceIds?: string[];
  formId?: string;
  label?: string;
  content?: string;
  placeholder?: string;
  input?: boolean;
  validate?: { required?: boolean };
  values?: Array<{ label: string; value: string }>;
  components?: HomepageBlock[];
  columns?: HomepageColumn[];
  tabs?: HomepageTab[];
  rows?: Array<Array<{ components: HomepageBlock[] }>>;
}

export type OrgFormStatus = 'draft' | 'published' | 'archived';
export type OrgFormVisibility = 'public' | 'private';

export interface FormioColumn {
  width?: number;
  currentWidth?: number;
  components: FormioComponent[];
}

export interface FormioComponent {
  type: string;
  key?: string;
  label?: string;
  title?: string;
  legend?: string;
  input?: boolean;
  placeholder?: string;
  description?: string;
  content?: string;
  html?: string;
  tag?: string;
  hidden?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  defaultValue?: unknown;
  inputMask?: string;
  prefix?: string;
  suffix?: string;
  action?: string;
  theme?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  form?: string;
  formId?: string;
  image?: string;
  questions?: Array<{ label: string; value: string }>;
  validate?: {
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  values?: Array<{ label: string; value: string }>;
  data?: { values?: Array<{ label: string; value: string }> };
  components?: FormioComponent[];
  columns?: FormioColumn[];
  rows?: Array<Array<{ components: FormioComponent[] }>>;
  serviceIds?: string[];
}

export interface FormioSchema {
  display?: string;
  components: FormioComponent[];
}

export interface OrgForm {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  schema: FormioSchema;
  publishedSchema?: FormioSchema | null;
  status: OrgFormStatus;
  visibility?: OrgFormVisibility;
  shareToken?: string | null;
  currentVersion?: number;
  publishedAt?: string | null;
  hasUnpublishedChanges?: boolean;
  submissionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrgFormVersion {
  id: string;
  organizationId: string;
  formId: string;
  versionNumber: number;
  name: string;
  schema: FormioSchema;
  createdByUserId?: string | null;
  createdAt: string;
}

export interface PublicOrgForm {
  name: string;
  description?: string | null;
  schema: FormioSchema;
  organizationName?: string | null;
}

export interface OrgFormSubmission {
  id: string;
  organizationId: string;
  formId: string;
  customerId?: string | null;
  appointmentId?: string | null;
  data: Record<string, unknown>;
  submittedByUserId?: string | null;
  formVersion?: number | null;
  createdAt: string;
}

export type WaitlistStatus = 'waiting' | 'offered' | 'booked' | 'cancelled';

export interface WaitlistEntry {
  id: string;
  organizationId: string;
  customerId: string;
  serviceId?: string | null;
  accountId?: string | null;
  preferredDate?: string | null;
  notes?: string | null;
  status: WaitlistStatus;
  createdAt: string;
  updatedAt: string;
}

export type GiftCardStatus = 'inactive' | 'active' | 'redeemed' | 'void';

export interface GiftCard {
  id: string;
  organizationId: string;
  code: string;
  originalCents: number;
  remainingCents: number;
  /** What the guest paid. May be less than originalCents when the card includes bonus credits. */
  priceCents?: number;
  customerId?: string | null;
  status: GiftCardStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServicePackage {
  id: string;
  organizationId: string;
  name: string;
  serviceId?: string | null;
  /** Redeemable value. 1 credit = $1 = 100 cents. */
  creditCents: number;
  /** Legacy visit count; kept in sync as whole credits. */
  visitCount?: number;
  priceCents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CustomerPackageStatus = 'active' | 'used' | 'void';

export interface CustomerPackage {
  id: string;
  organizationId: string;
  packageId: string;
  customerId: string;
  remainingCreditCents: number;
  remainingVisits?: number;
  status: CustomerPackageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipPlan {
  id: string;
  organizationId: string;
  name: string;
  priceCents: number;
  interval: 'month' | 'year';
  visitsIncluded?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CustomerMembershipStatus = 'active' | 'paused' | 'cancelled';

export interface CustomerMembership {
  id: string;
  organizationId: string;
  planId: string;
  customerId: string;
  status: CustomerMembershipStatus;
  nextBillOn: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionRow {
  accountId: string;
  name: string;
  salesCents: number;
  tipCents: number;
  commissionCents: number;
  saleCount: number;
}

export interface CommissionReport {
  from: string;
  to: string;
  rows: CommissionRow[];
}

export type StaffPayoutMode = 'track_only' | 'salon_stripe';
export type StaffPayoutSchedule = 'manual' | 'weekly' | 'biweekly' | 'monthly';
export type StaffPayoutStatus = 'pending' | 'succeeded' | 'failed' | 'skipped';

export interface StaffPayoutRecipient {
  accountId: string;
  name: string;
  email: string;
  onboardingComplete: boolean;
  payoutsReady: boolean;
}

export interface StaffPayoutSettings {
  mode: StaffPayoutMode;
  schedule: StaffPayoutSchedule;
  includeCommission: boolean;
  includeTips: boolean;
  lastAutoPeriodFrom: string | null;
  lastAutoPeriodTo: string | null;
  lastAutoRunAt: string | null;
  salonStripeReady: boolean;
  recipients: StaffPayoutRecipient[];
}

export interface StaffPayoutLedgerRow {
  id: string;
  organizationId: string;
  staffAccountId: string;
  periodFrom: string;
  periodTo: string;
  commissionCents: number;
  tipCents: number;
  totalCents: number;
  stripeTransferId?: string | null;
  status: StaffPayoutStatus;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffPayoutPreviewRow {
  accountId: string;
  name: string;
  salesCents: number;
  tipCents: number;
  commissionOnSubtotalCents: number;
  commissionCents: number;
  totalCents: number;
  payoutsReady: boolean;
  alreadyPaid: boolean;
  skipReason: 'zero' | 'not_ready' | 'already_paid' | null;
  status?: StaffPayoutStatus | 'zero';
  payoutId?: string;
  error?: string | null;
}

export interface StaffPayoutPreview {
  from: string;
  to: string;
  mode: StaffPayoutMode;
  includeCommission: boolean;
  includeTips: boolean;
  rows: StaffPayoutPreviewRow[];
  recentPayouts: StaffPayoutLedgerRow[];
}

export type InvoiceStatus = 'unpaid' | 'paid';
export type ReceiptChannel = 'print' | 'sms' | 'email' | 'none';
export type MerchantPrintStatus = 'printed' | 'skipped' | 'failed';

export interface InvoiceLineSnapshot {
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  customerId?: string | null;
  appointmentId?: string | null;
  saleId?: string | null;
  status: InvoiceStatus;
  amountCents: number;
  currency: string;
  publicToken: string;
  lineItems: InvoiceLineSnapshot[];
  sentAt?: string | null;
  sentChannel?: 'email' | 'sms' | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptSnapshot {
  organizationName: string;
  customerName: string;
  lineItems: InvoiceLineSnapshot[];
  subtotalCents: number;
  tipCents: number;
  totalCents: number;
  paidAt: string;
  paymentMethod: string;
}

export interface DeliverReceiptResult {
  receipt: ReceiptSnapshot;
  merchantPrint: { status: MerchantPrintStatus; attempted: boolean };
  invoice: Invoice | null;
  publicUrl: string | null;
  smsPaused: boolean;
  smsPausedMessage: string | null;
}

export interface SendInvoiceResult {
  invoice: Invoice;
  publicUrl: string;
  smsPaused: boolean;
  smsPausedMessage: string | null;
  customerPrefill: { email: string | null; phone: string | null };
}

export interface PublicInvoiceView {
  invoice: {
    id: string;
    status: InvoiceStatus;
    amountCents: number;
    currency: string;
    lineItems: InvoiceLineSnapshot[];
    paidAt?: string | null;
  };
  organizationName: string;
  customerName: string;
  canPayOnline: boolean;
  publishableKey: string | null;
}
