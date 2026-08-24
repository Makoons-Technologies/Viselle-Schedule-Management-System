export function e2eCredentials() {
  const email = process.env.PLAYWRIGHT_EMAIL?.trim() || process.env.PLAYWRIGHT_STAFF_EMAIL?.trim() || '';
  const password =
    process.env.PLAYWRIGHT_PASSWORD?.trim() || process.env.PLAYWRIGHT_STAFF_PASSWORD?.trim() || '';
  return { email, password };
}

export function hasE2eCredentials() {
  const { email, password } = e2eCredentials();
  return Boolean(email && password);
}

/** Signed-in homes: platform dashboard, org dashboard/calendar, or staff schedule. */
export const signedInHomeUrl =
  /\/(platform\/dashboard|orgs\/[^/]+\/(dashboard|calendar)|staff\/schedule)/;
