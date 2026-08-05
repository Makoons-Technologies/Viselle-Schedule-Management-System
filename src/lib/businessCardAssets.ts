/** MOO-style gold foil plates (SVG) + shine cutout masks for /business-card and /social. */
export const FOIL_FRONT_SRC = '/bc-foil-front.svg';
export const FOIL_FRONT_MASK_SRC = '/bc-foil-front-mask.svg';
export const FOIL_BACK_SRC = '/bc-foil-back.svg';
export const FOIL_BACK_MASK_SRC = '/bc-foil-back-mask.svg';

export const GET_STARTED_DISPLAY = 'VISELLE.NET/GET-STARTED';

export function formatRedeemBy(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export function getStartedUrl(code?: string | null) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://viselle.net';
  if (!code) return `${origin}/get-started`;
  return `${origin}/get-started?code=${encodeURIComponent(code)}`;
}

export function businessCardUrl(code?: string | null) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://viselle.net';
  if (!code) return `${origin}/business-card`;
  return `${origin}/business-card?code=${encodeURIComponent(code)}`;
}

export function socialUrl(code?: string | null) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://viselle.net';
  if (!code) return `${origin}/social`;
  return `${origin}/social?code=${encodeURIComponent(code)}`;
}
