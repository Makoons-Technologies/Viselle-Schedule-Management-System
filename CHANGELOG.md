# Changelog

All notable releases of Viselle (Beauty-Backend-API + Viselle Schedule Management System) are documented here.

Versioning: **x.y.z** — patch (z) = unnoticeable unless a bug hits you; minor (y) = noticeable but no retraining; major (x) = breaking or requires retraining.

Phases: Viselle is in **beta** (3-month trials). Path: alpha → beta → **GA** (1.0.0+).

## [0.2.0] — 2026-08-05 (beta)

Beta polish: business card/social, API docs, contact/releases, trial expiry cron.

### Frontend

- Make API docs Quick links a clear top-of-card list with endpoint sections.
- Remove digital business card link from the landing hero.
- Add sticky on-this-page quick links to public API docs.
- Mark Viselle as beta in release notes and drop the staging-to-main intro sentence.
- Align Contact page with marketing shell chrome used on Releases and API docs.
- Fix API docs card contrast when dark mode is active.
- Fix release notes card contrast when dark mode is active.
- Swap offer-line foil script from Cormorant to Great Vibes for sharper card elegance.
- Enlarge business-card and social-share type, fix square canvas and QR aspect.
- Restore business-card foil as shared silhouette masks and fill the card.
- Fix business card layout by dropping MOO full-plate foil overlays that collided with text.
- Clean up social share layout so the V crest is not covered by copy.
- Revert business-card foil to MOO PNG plates (option 1).
- Replace MOO foil PNGs with SVG and add /social share page.
- Add consistent search and filters to dashboard tables.
- Report SPA crashes to the API for Vercel Runtime Logs.
- Remove Stripe from the plan-required lock banner copy.
- Add MOO gold foil plates as business-card shine cutouts.
- Lock business card to landscape and fix foil shine for device rotation.
- Make business card landscape/portrait follow device orientation.

### API

- Expire due trials on Vercel and sync admin plan status.
- Update business-card foil design note for SVG and /social.
- Add vitest coverage for auth, signup, appointments, and support critical paths.
- Add free structured error logging to Vercel Runtime Logs.
- Drop Stripe from PLAN_REQUIRED user-facing error message.
- Document MOO foil-layer design for digital business cards.

## [0.1.0] — 2026-08-02 (beta)

Business card, Inbox triage, appointment viewer, mobile nav/refer/theme, and calendar timezone fixes.

### Frontend

- Defer staging push until Multitask Mode batches finish.
- Add Help & Support attachment picker and previews.
- Default business card to landscape and remove V logo drop shadow.
- Auto-enable business-card motion tilt and unify marketing pages on the card palette.
- Document staging CORS login failures from API Vercel SSO.
- Fix business card flip, mobile text, motion prompt, and V-only foil sheen.
- Point staging env docs at staging-api.viselle.net.
- Rename Inbox QA Ready status key to in_review to match Linear.
- Unify platform Inbox triage with agent handoff and Linear-aligned statuses.
- Align digital business card palette with homepage brand rose colors.
- Detect when business card campaign save does not persist.
- Add immersive /business-card page with foil tilt and campaign code.
- Add refer-a-friend, follow-system toggle, and mobile input zoom guard.
- Redesign appointment detail sheet to match client manage-booking layout.
- Use high-res PNG for large ViselleLogo so the homepage hero mark stays sharp.
- Add mobile edge-swipe open and drag-to-close for the nav drawer.
- Enlarge homepage hero Viselle logo for a stronger brand signal.
- Bust logo cache and serve flattened SVG without grey disc.
- Use transparent Viselle logo PNGs without baked-in grey disc.
- Fix invisible Viselle mark by using PNG in UI and flattening SVG fills.
- Lighten Viselle logo disc so gold mark stays visible on dark chrome.
- Require cut-release to bump and auto-gather notes for staging to main.
- Remove incorrect separate-database note from release notes.
- Use a grey logo disc so the gold mark stays visible on dark UI.
- Handle plan downgrades with a staff-trim dialog and solo Starter.
- Drop phantom Business plan features from the comparison catalog.
- Use the original Viselle logo SVG for UI and regenerate raster icons from it.
- Replace Viselle brand mark with the updated gold circular V logo.
- Block plan downgrades for orgs on an active trial.
- Default homepage trial locked plan when the API omits lockedTier.
- Disable unavailable website add-ons and lock trial code during homepage trials.

### API

- Defer staging push until Multitask Mode batches finish.
- Add private file attachments for Help & Support tickets.
- Document Vercel SSO on staging-api as the staging login CORS cause.
- Point staging env docs at staging-api.viselle.net.
- Add Inbox QA Ready workflow, agent-brief API, and optional Linear sync.
- Harden business card campaign settings persistence.
- Fix appointment calendar times drifting from email wall-clock.
- Add platform setting to assign a campaign to the digital business card.
- Require cut-release to bump and auto-gather notes for staging to main.
- Enforce staff seat caps on plan change and solo Starter.
- Drop phantom Business plan features from the comparison catalog.
- Reject trial plan downgrades on checkout and change-plan.
- Default missing trial lockedTier so checkout does not crash.

## [0.0.1] — 2026-07-25 (alpha)

Initial alpha baseline of the Viselle scheduling platform.

### Added

- Multi-tenant org scheduling: calendar, appointments, staff, services, products, availability, customers
- Public booking pages (path and hosted subdomain), checkout/payments via Stripe
- Self-serve signup, trial campaigns / referral codes, configurable reminders
- Platform owner tools: organizations, trials & campaigns, support inbox, custom website requests
- Public developer API docs and this public release notes surface

### Notes

- Still in **alpha**. APIs and UX may change without a major bump until beta/GA.
