# End-to-end tests (Playwright)

Heavy browser smokes for the Viselle frontend. These are **not** part of `npm run build`. Keep the first suite small — do not add Stripe/checkout coverage here unless a fully mocked path is already reliable.

## Install browsers

Once per machine (Chromium only):

```bash
npm run test:e2e:install
```

Firefox and WebKit are optional later; the config currently runs Chromium only.

## Environment

Copy `.env.e2e.example` to `.env.e2e` (gitignored). Playwright loads `.env.e2e` automatically.

| Variable | Purpose |
|---|---|
| `PLAYWRIGHT_BASE_URL` | Target UI. Defaults to `http://localhost:5173`. |
| `PLAYWRIGHT_EMAIL` / `PLAYWRIGHT_PASSWORD` | Non-production login for the auth smoke. |
| `PLAYWRIGHT_STAFF_EMAIL` / `PLAYWRIGHT_STAFF_PASSWORD` | Optional staff login if the owner vars are empty. |

Never use production (`https://viselle.net`) or production passwords. Local seed example (comments only in `.env.e2e.example`): `owner@test.com` / `password123`.

## Run

```bash
# Local Vite — starts `npm run dev` unless something is already on :5173
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# Staging UI (does not start Vite)
# PowerShell:
$env:PLAYWRIGHT_BASE_URL="https://staging.viselle.net"
npm run test:e2e
```

The authenticated spec **skips** if email/password are missing. Public marketing + login page specs always run.

Local login also needs the Beauty-Backend-API (typically `http://localhost:3001`) and a seeded user. Staging should use a **staging** account only.
