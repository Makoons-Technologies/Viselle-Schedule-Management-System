# Staging, environments, and releases (Viselle frontend)

Companion doc: Beauty-Backend-API `docs/staging-and-releases.md`.

## Branch model

| Branch | Purpose |
|--------|---------|
| `staging` | Default integration. Merge feature work here first. |
| `main` | Production frontend. Promote from `staging` when cutting a release. |

## Semver

Shared with the API. Start **0.0.1** (alpha).

| Segment | Meaning |
|---------|---------|
| **z** | Unnoticeable unless a bug hits the user |
| **y** | Noticeable; no retraining |
| **x** | Breaking / requires retraining |

Phases: alpha → beta (3-month trials) → GA (`1.0.0+`).

Bump both repos to the **same** version when promoting.

## Public release notes

- Route: `/releases` (alias `/release-notes`)
- No auth
- Footer: “Release notes” next to API docs
- Sources: `CHANGELOG.md` and `src/content/releases.md` (page renders the latter)

## Hosted staging (Vercel)

1. Connect the GitHub repo in Vercel.
2. Production: deploy **`main`** with production env (`VITE_API_BASE_URL` → production API).
3. Staging: deploy the **`staging`** branch (second project **or** configure the staging branch as a dedicated environment).
4. Staging env — copy from `.env.staging.example`:
   - `VITE_API_BASE_URL` = staging API base ending in `/api/v1`
   - `VITE_BOOKING_BASE_URL` = staging site origin
   - Stripe publishable key = **test** mode preferred

The staging API must use a **separate Supabase project** from production. Do not share one DB.

## Cut release

```powershell
npm run cut-release -- --bump patch --notes "Short public summary."
```

Also run the same bump in Beauty-Backend-API, then merge `staging` → `main` in both repos, tag `vX.Y.Z`, and deploy.
