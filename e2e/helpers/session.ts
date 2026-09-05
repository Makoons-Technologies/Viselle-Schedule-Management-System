import type { Page } from '@playwright/test';

export const AUTH_TOKEN_KEY = 'viselle_auth_token';

export const platformOwnerUser = {
  id: 'e2e-platform-owner',
  email: 'platform-e2e@viselle.test',
  role: 'platform_owner' as const,
  organizationId: null,
  memberships: [],
};

export const orgOwnerUser = {
  id: 'e2e-org-owner',
  email: 'org-e2e@viselle.test',
  role: 'org_owner' as const,
  organizationId: 'org-e2e-1',
  memberships: [
    {
      organizationId: 'org-e2e-1',
      organizationName: 'E2E Salon',
      accountId: 'acct-e2e-1',
      accountRole: 'owner',
    },
  ],
};

/** Platform owner viewing an org as its owner — ImpersonationBanner is lead chrome. */
export const impersonatedOrgOwnerUser = {
  id: 'e2e-impersonated-owner',
  email: 'grokbot-subdomain-owner@viselle.test',
  role: 'org_owner' as const,
  organizationId: 'org-e2e-1',
  impersonatedBy: 'e2e-platform-owner',
  impersonatedByEmail: 'platform-e2e@viselle.test',
  memberships: [
    {
      organizationId: 'org-e2e-1',
      organizationName: 'grokbot Subdomain House',
      accountId: 'acct-e2e-1',
      accountRole: 'owner',
    },
  ],
};

const e2eOrganization = {
  id: 'org-e2e-1',
  name: 'grokbot Subdomain House',
  slug: 'grokbot-subdomain-house',
  status: 'active',
  billingStatus: 'active',
  isDev: true,
};

export async function mockOrgDashboardApis(page: Page) {
  // Playwright matches last-registered route first. Register the org
  // catch-all first so specific list/plan routes win.
  await page.route('**/organizations/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/plan')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: {
            subscriptionTier: 'professional',
            tierName: 'Professional',
            hasStripeSubscription: true,
            smsRemindersEnabled: false,
            smsSendingEnabled: false,
            emailRemindersEnabled: false,
            recurringAppointmentsEnabled: false,
            maxStaffAccounts: 5,
            monthlyPriceCents: 0,
            subdomainHostingEnabled: true,
          },
        }),
      });
      return;
    }
    if (url.includes('/appointments')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ appointments: [] }),
      });
      return;
    }
    if (url.includes('/accounts')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accounts: [] }),
      });
      return;
    }
    if (url.includes('/services')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ services: [] }),
      });
      return;
    }
    if (url.includes('/customers')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ customers: [] }),
      });
      return;
    }
    if (url.includes('/homepage-layout')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ blocks: [] }),
      });
      return;
    }
    if (url.includes('/staff-permissions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          staffPermissions: {
            canCreateAppointments: true,
            canManageCustomers: true,
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ organization: e2eOrganization }),
    });
  });
}

/** Seed a stored session before the app boots so LandingPage sees a likely session. */
export async function seedStoredToken(page: Page, token = 'e2e-session-token') {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: AUTH_TOKEN_KEY, value: token },
  );
}

export async function mockAuthMe(page: Page, user: object, options?: { delayMs?: number }) {
  await page.route('**/auth/me', async (route) => {
    if (options?.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    });
  });
}

export async function mockPlatformLogin(page: Page, user: object = platformOwnerUser, token = 'e2e-session-token') {
  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token, user, memberships: [] }),
    });
  });
}

export async function mockPlatformDashboardApis(page: Page) {
  await page.route('**/owner/organizations', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ organizations: [] }),
    });
  });
  await page.route('**/owner/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stats: {
          totalOrganizations: 0,
          activeOrganizations: 0,
          trialOrganizations: 0,
          inactiveOrganizations: 0,
          billingActiveOrganizations: 0,
          devOrganizations: 0,
          estimatedMrrCents: 0,
          organizationsByTier: {
            starter: 0,
            professional: 0,
            business: 0,
            custom: 0,
          },
        },
      }),
    });
  });
  await page.route('**/owner/reports/mrr**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        metric: 'mrr',
        granularity: 'week',
        from: '2026-01-01',
        to: '2026-08-30',
        series: [],
        currentMrrCents: 0,
        totalNewOrganizationsCount: 0,
      }),
    });
  });
}
