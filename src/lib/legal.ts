/** Canonical live legal pages for A2P / ClickSend review. Always www — salon subdomains do not mount these routes. */
export const VISELLE_PRIVACY_URL = 'https://www.viselle.net/privacy';
export const VISELLE_TERMS_URL = 'https://www.viselle.net/terms';

export function smsOptInStatement(brandName: string): string {
  return `By checking this box, you agree to receive appointment reminders and booking texts from ${brandName}. Msg freq varies. Msg & data rates may apply. Reply HELP for help and STOP to opt out.`;
}
