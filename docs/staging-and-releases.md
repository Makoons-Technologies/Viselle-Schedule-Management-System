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

**Every** staging → main promote must bump the version (same bump in both repos).

## Public release notes

- Route: `/releases` (alias `/release-notes`)
- No auth
- Footer: “Release notes” next to API docs
- Sources: `CHANGELOG.md` and `src/content/releases.md` (page renders the latter)

`cut-release` gathers commit subjects since the last `vX.Y.Z` tag (or `origin/main` if untagged) from this repo and, when present, the sibling Beauty-Backend-API repo, then prepends a dated section to both changelog files.

## Hosted staging (Vercel)

1. Connect the GitHub repo in Vercel.
2. Production: deploy **`main`** with production env (`VITE_API_BASE_URL` → production API).
3. Staging: deploy the **`staging`** branch (second project **or** configure the staging branch as a dedicated environment).
4. Staging env — copy from `.env.staging.example`:
   - `VITE_API_BASE_URL` = `https://staging-api.viselle.net/api/v1`
   - `VITE_BOOKING_BASE_URL` = `https://staging.viselle.net`
   - Stripe publishable key = **test** mode preferred
5. After changing `VITE_*`, redeploy (Vite embeds them at build time).

### Homepage “Start free trial” campaign

The hero CTA goes to `/get-started?trial=1&code=HOMEPAGE14`. Get-started prefers a live **homepage** campaign from `GET /signup/trials/homepage`. If that returns `null`, it applies `HOMEPAGE14` (a 14-day `free_no_card` code campaign) after the API validates it.

Staging must have both rows in `trial_campaigns` (seeded 2026-09-03 for BEA-86; recreate if the staging DB is reset):

| type | name | code | duration | payment_mode | enabled |
|---|---|---|---|---|---|
| `homepage` | Homepage Beta Period | *(null)* | 14 | `free_no_card` | true |
| `code` | Homepage 14-day fallback | `HOMEPAGE14` | 14 | `free_no_card` | true |

Do not invent a client-side $0 cart without a redeemable campaign. Paid `/get-started` without `trial=1` is unchanged.

### CORS / login failures on staging

If Network shows `login` as **CORS error** / preflight `(failed)`, the usual cause is **not** missing app CORS allowlist — the API uses open CORS. Check that the **staging API** Vercel project (`staging-api.viselle.net`) has **Deployment Protection disabled**. With Vercel Authentication on, `OPTIONS` redirects to SSO and the browser reports CORS. Details: Beauty-Backend-API `docs/staging-and-releases.md` (section “disable Vercel Deployment Protection”).

## Cut release (required before staging → main)

On **both** repos, from up-to-date `staging`:

```powershell
# Preview first (optional). On Windows npm may drop flags — call node directly:
node scripts/cut-release.mjs --bump=patch --dry-run

# Write VERSION / package.json / CHANGELOG / releases.md
node scripts/cut-release.mjs --bump=patch --notes="Optional one-line public summary."
```

Use `--bump minor` or `--bump major` as appropriate. Same bump + notes in Beauty-Backend-API.

Checklist:

1. [ ] Staging verified
2. [ ] `cut-release` in **both** repos (same version)
3. [ ] Review gathered bullets on `/releases` sources; edit if needed
4. [ ] Commit on `staging`, push
5. [ ] Merge `staging` → `main` (no force-push)
6. [ ] Tag `vX.Y.Z` on both repos and push tags
7. [ ] Confirm production deploy from `main`
