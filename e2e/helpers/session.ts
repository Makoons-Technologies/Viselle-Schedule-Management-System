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
        },
      }),
    });
  });
  await page.route('**/owner/reports/mrr**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ points: [] }),
    });
  });
}
