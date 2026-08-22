# Public Booking API

> Readable HTML version (no login): [viselle.net/docs/api](https://viselle.net/docs/api)
> Raw markdown: `GET /api/v1/docs/public-booking-api`

This is the API that powers Viselle's booking pages. It is **included** with every
organization — you do not switch a hosting mode or turn on a custom website to use it.

Viselle-hosted pages (the included `/book/…` link and `yourspa.viselle.net`) already call
this API for you. If you book from **your own website or app**, generate an API key in
**Settings → Booking website** and call these endpoints directly.

## Base URL

```
https://api.viselle.net/api/v1/public
```

(Locally: `http://localhost:3001/api/v1/public`.) All endpoints below are relative to this base
URL, unless noted otherwise.

## Authentication

The Public Booking API is available in every hosting mode. A key is only required when
you call it from **your own site** (or any non-Viselle page). Viselle-hosted booking
pages do not send a key.

| Who is calling | Auth required |
|---|---|
| Viselle-hosted booking page (`path` / `subdomain`) | None |
| Your website or app (any hosting mode) | **API key + origin allowlist**, see below |
| Dashboard link set to an external site (`external_api`) | **API key + origin allowlist** |

A Viselle-built custom website uses the same API. Turning that add-on on does **not**
enable or disable API access.

### Getting an API key

1. In the Viselle console, go to **Settings → Booking website**.
2. Open **Developer API** (it is on every org — you do not switch hosting mode).
3. Click **Generate API key**. The full key is shown once — copy and store it securely
   (only a short prefix is shown afterwards for identification).
4. Add the domain(s) that will call the API to **Allowed origins** (e.g.
   `https://www.your-salon.com`). Requests from browsers are checked against this list using the
   `Origin`/`Referer` header. Leave the list empty to allow any origin (not recommended for
   production).
5. You can regenerate your key at any time; the previous key stops working immediately.

### Sending the key

Send the key on every request to an `/organizations/:slug/...` endpoint, using **either**:

```
x-api-key: vsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

or

```
Authorization: Bearer vsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Requests without a valid key (or from a disallowed origin, when the allowlist is non-empty)
receive `403 Forbidden`. The customer-facing appointment management endpoints
(`/appointments/:managementToken/...`) never require an API key — they're already scoped to a
single appointment via its token.

## Errors

All errors share this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { "...": "optional, e.g. Zod validation issues" }
  }
}
```

Common codes: `VALIDATION_ERROR` (400), `FORBIDDEN` (403), `NOT_FOUND` (404),
`RATE_LIMITED` (429), `TIME_SLOT_UNAVAILABLE` (400), `ORG_INACTIVE` / `BILLING_INACTIVE` (403).

## Endpoints

### Get organization

```
GET /organizations/:slug
```

Returns basic public org info and booking site metadata.

```json
{
  "id": "…",
  "name": "Demo Spa",
  "slug": "demo-spa",
  "publicBookingEnabled": true,
  "smsRemindersEnabled": true,
  "bookingSite": {
    "hostingMode": "external_api",
    "siteTemplate": "classic",
    "deploymentStatus": "deployed",
    "branding": { "...": "..." }
  }
}
```

`smsRemindersEnabled` is true when this business can send appointment SMS (plan + org setting). If you collect a phone number, you must obtain SMS opt-in before booking (see below).

### List services

```
GET /organizations/:slug/services
```

Returns active, bookable services only.

```json
{
  "services": [
    { "id": "…", "name": "Haircut", "durationMinutes": 45, "priceCents": 6500, "isActive": true }
  ]
}
```

### List products

```
GET /organizations/:slug/products
```

Returns active retail products suitable for public display (e.g. a shop section on a custom
booking site). Response fields are limited to catalog-safe data — no cost, stock levels, SKU,
or barcode.

```json
{
  "products": [
    {
      "id": "…",
      "name": "Hydrating Shampoo",
      "description": "Sulfate-free formula for color-treated hair.",
      "priceCents": 2800,
      "isActive": true
    }
  ]
}
```

### Get one product

```
GET /organizations/:slug/products/:productId
```

Returns a single active product for the org, or `404` if missing/inactive.

```json
{
  "product": {
    "id": "…",
    "name": "Hydrating Shampoo",
    "description": "Sulfate-free formula for color-treated hair.",
    "priceCents": 2800,
    "isActive": true
  }
}
```

### List staff/accounts

```
GET /organizations/:slug/accounts
```

Returns bookable staff (id + name only — no contact info).

```json
{ "accounts": [{ "id": "…", "firstName": "Jamie", "lastName": "Lee" }] }
```

### Get availability for one staff member

```
GET /organizations/:slug/accounts/:accountId/availability
```

Query params (all required): `serviceId` (uuid), `startDate` (`YYYY-MM-DD`), `endDate`
(`YYYY-MM-DD`), `timezone` (IANA, e.g. `America/New_York`).

```json
{ "availableSlots": [{ "startTime": "2026-08-01T14:00:00.000Z", "endTime": "2026-08-01T14:45:00.000Z" }] }
```

### Get org-wide availability

```
GET /organizations/:slug/availability
```

Same query params as above, but returns slots across all bookable staff who can perform the
service, with `availableAccounts` listing who's free for each slot.

### Check SMS consent (first-time opt-in)

```
GET /organizations/:slug/sms-consent?email=&phone=
```

Provide `email` and/or `phone`. Returns `{ "smsConsented": true }` when this customer has already
opted in to appointment texts for this business. Use this to hide the SMS opt-in checkbox for
returning customers.

### Create a booking

```
POST /organizations/:slug/appointments
```

Body:

```json
{
  "accountId": "…",
  "serviceId": "…",
  "customer": { "firstName": "Ada", "lastName": "Lovelace", "email": "ada@example.com", "phone": "+15555550100" },
  "startTime": "2026-08-01T14:00:00.000Z",
  "timezone": "America/New_York",
  "appointmentNotes": "First visit",
  "smsOptIn": true
}
```

`customer.email` and `customer.phone` are each optional, but at least one is recommended so the
customer receives confirmation/reminders.

If `smsRemindersEnabled` is true and you send a phone number for a customer who has not already
consented, `smsOptIn` must be `true` (unchecked-by-default checkbox on your form). Leave phone
blank to skip SMS. Viselle will not text a customer who has not opted in. Response:

```json
{
  "appointment": {
    "id": "…",
    "visitStatus": "scheduled",
    "paymentStatus": "unpaid",
    "startTime": "2026-08-01T14:00:00.000Z",
    "endTime": "2026-08-01T14:45:00.000Z"
  },
  "managementToken": "…",
  "confirmationMessage": "Your appointment has been booked."
}
```

Save `managementToken` if you want to let the customer view/reschedule/cancel later (see below);
Viselle also emails/texts them a management link if reminders are enabled for the org.

### Customer self-service (by management token)

These do **not** require an API key — the token itself is the credential. They're not scoped
under `/organizations/:slug`, they hang directly off the public base URL:

```
GET   /appointments/:managementToken
GET   /appointments/:managementToken/calendar.ics
PATCH /appointments/:managementToken/reschedule
PATCH /appointments/:managementToken/cancel
```

- `GET /appointments/:managementToken` — full appointment + org + service + staff details for a
  "manage my booking" page.
- `GET /appointments/:managementToken/calendar.ics` — downloadable `.ics` file
  (`Content-Type: text/calendar`).
- `PATCH .../reschedule` — body `{ "startTime": "...", "timezone": "..." }`. Not allowed for
  recurring appointments.
- `PATCH .../cancel` — body `{ "reason": "optional" }`. Not allowed for recurring appointments.

## Example: booking from your own site (fetch)

```js
const BASE = 'https://api.viselle.net/api/v1/public';
const API_KEY = 'vsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; // keep server-side if possible
const SLUG = 'your-salon-slug';

async function bookAppointment() {
  const res = await fetch(`${BASE}/organizations/${SLUG}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({
      accountId: '...',
      serviceId: '...',
      customer: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
      startTime: '2026-08-01T14:00:00.000Z',
      timezone: 'America/New_York',
    }),
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error.message);
  }

  return res.json();
}
```

> Because the API key is a secret, prefer calling this API from a small server-side proxy on your
> own site rather than directly from client-side JavaScript. If you must call it from the
> browser, restrict it with the allowed-origins list and treat the key as semi-public — rotate it
> if you suspect it has leaked.

## Example: booking from your own site (curl)

```bash
curl -X POST "https://api.viselle.net/api/v1/public/organizations/your-salon-slug/appointments" \
  -H "Content-Type: application/json" \
  -H "x-api-key: vsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{
    "accountId": "...",
    "serviceId": "...",
    "customer": { "firstName": "Ada", "lastName": "Lovelace", "email": "ada@example.com" },
    "startTime": "2026-08-01T14:00:00.000Z",
    "timezone": "America/New_York"
  }'
```

## Rate limits

The Public Booking API is **included** with an active subscription or full-access trial.
There is no per-booking or per-request charge. Limits are request-rate caps only, so one
site cannot overwhelm the platform.

| Traffic | How it is keyed | Default budget |
|---|---|---|
| Viselle-hosted booking (`path` / `subdomain`, no API key) | Client IP + organization slug | **60 requests / 10 seconds** |
| External API (`x-api-key` or `Authorization: Bearer`, valid or attempted) | Hashed API key + slug (the raw key is never logged) | **20 requests / 10 seconds** |
| Customer management (`/appointments/:managementToken/...`) | Client IP | **60 requests / 10 seconds** (hosted budget) |

`POST /organizations/:slug/appointments` shares the same window and budget as reads for
that key. A normal page load plus booking one appointment will not be blocked.

When a limit is exceeded the API returns HTTP `429` with `error.code` `RATE_LIMITED` and a
`Retry-After` header (seconds to wait). Enforcement is in-memory per server instance —
best-effort on multi-instance hosts such as Vercel, not a global quota.

Operators can override defaults with `PUBLIC_API_RATE_LIMIT_WINDOW_MS`,
`PUBLIC_API_RATE_LIMIT_HOSTED_MAX`, and `PUBLIC_API_RATE_LIMIT_EXTERNAL_MAX`.

Cache service, staff, and product lists client-side rather than polling.

## Notes & limitations

- Rate limits above apply to `/api/v1/public` only (not owner/staff APIs).
- Fields not documented above (e.g. internal IDs) may appear in responses and should be treated
  as unstable; only rely on the fields shown in the examples.
- If you need functionality this API doesn't cover (webhooks, payments, custom fields), open a
  support ticket from the Viselle console (Help → Submit a ticket) — this is the fastest way to
  reach the team that owns this API.
