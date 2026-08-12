# PWA Add to Home Screen + Alert Channels (Design)

**Date:** 2026-08-11  
**Status:** Approved for Phase 1 implementation planning  
**Repo:** Viselle Schedule Management System (frontend); later phases also touch Beauty-Backend-API  

## Goal

Let owners and staff install Viselle on phone/tablet home screens so it opens fullscreen (FitLife-style PWA), and eventually deliver staff/owner alerts over **email + SMS + push**:

1. Upcoming appointment reminders for staff/owners  
2. Low-inventory alerts when stock hits a configured percent of capacity  

App Store / Play Store wrappers are **out of scope** for now.

## Approach (locked)

**Phased PWA + alerts (Approach A):**

| Phase | Deliverable |
|-------|-------------|
| **1** | PWA + Settings “Add to Home Screen” (mobile only) |
| **2** | Web Push opt-in + subscription storage |
| **3** | Staff/owner appointment reminders → email + SMS + push |
| **4** | Low-stock % alerts → email + SMS + push |

This document specifies **Phase 1** in detail and sketches later phases so they stay aligned.

---

## Phase 1 — PWA + Add to Home Screen

### Problem

Staff on iPhone / iPad / Android want Viselle as a home-screen app (fullscreen, no browser chrome). Desktops should not see this affordance. There is no programmatic one-tap install on iOS.

### Constraints / platform restrictions

- **iOS / iPadOS Safari:** No `beforeinstallprompt`. Button must show Share → Add to Home Screen instructions. Fullscreen works after install when `apple-mobile-web-app-capable` / manifest `standalone` are set. Web Push (later) only after the PWA is installed (iOS 16.4+).
- **Android Chrome:** Can show a real install prompt when the site is installable (manifest + service worker + HTTPS + icons).
- **Desktop:** Hide the Settings row entirely.
- **Already installed:** Hide the row when `display-mode: standalone` (or equivalent iOS standalone detection).

### Architecture

Frontend-only. No API or DB changes.

```
index.html + manifest + SW  →  installable / standalone shell
                ↓
useAddToHomeScreen hook     →  visibility + Android prompt / iOS copy
                ↓
SettingsHubPage row         →  mobile-only “Add to Home Screen” action
```

### Components

1. **`public/manifest.webmanifest`**
   - `name` / `short_name`: Viselle  
   - `start_url`: `/` (or org-safe default that still lands in the app)  
   - `display`: `standalone`  
   - `background_color` / `theme_color`: match existing brand (light stone / dark-aware as practical)  
   - Icons: at least **192×192** and **512×512** PNG (maskable where practical). Reuse / derive from existing `apple-touch-icon.png` / logo assets.

2. **Service worker (minimal)**
   - Register from app bootstrap (`main.tsx` or small `registerSW` helper).  
   - Phase 1: network-first / pass-through is enough — goal is **installability**, not offline.  
   - Prefer a small hand-rolled SW or Vite PWA plugin; keep scope tiny (no aggressive caching of API responses).

3. **`index.html`**
   - `<link rel="manifest" href="/manifest.webmanifest">`  
   - iOS hints: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`  
   - Keep existing `apple-touch-icon`.

4. **`useAddToHomeScreen` (or equivalent)**
   - `isMobileDevice`: true for phone/tablet (touch + UA / coarse pointer); false for PC.  
   - `isStandalone`: `matchMedia('(display-mode: standalone)')` or `navigator.standalone`.  
   - `canPrompt`: Android captured `beforeinstallprompt` event.  
   - `promptInstall()`: call `event.prompt()` when available.  
   - `showRow`: `isMobileDevice && !isStandalone`.

5. **Settings hub UI**
   - New row in `SettingsHubPage` (same list styling as existing links).  
   - Label: **Add to Home Screen**.  
   - Icon: e.g. `Download` / `Smartphone` from lucide.  
   - Not a router `Link` — `button` that triggers prompt or opens instructions.  
   - Visible for any role that sees Settings (owners and staff), when `showRow` is true.  
   - **iOS instructions:** compact dialog/sheet — Share icon → Add to Home Screen.  
   - **Android fallback** (no deferred prompt): short Chrome menu instructions.

### Data flow

1. App loads → register SW → listen for `beforeinstallprompt` (store event).  
2. User opens Settings → if `showRow`, render action.  
3. Tap → Android prompt if possible; else platform instructions modal.  
4. After install / reopen as standalone → row hidden.

### Error handling

- Missing install prompt on Android: fall back to instructions (do not error).  
- SW registration failure: log; still show iOS/Android instructions (iOS does not need SW for Add to Home Screen; Android installability may fail — instructions still help).  
- Do not block app boot on SW failure.

### Testing / verification

- `npm run build` passes.  
- Manual: desktop — row absent.  
- Manual: mobile Safari — row present; instructions accurate; after Add to Home Screen, opens fullscreen; row hidden in standalone.  
- Manual: Android Chrome — install prompt or instructions; installed app is standalone.  
- Lighthouse / DevTools Application panel: manifest valid, SW registered on staging HTTPS.

### Out of scope (Phase 1)

- Push notifications, VAPID keys, subscription API  
- Offline-first caching strategy  
- Staff appointment or inventory alert logic  
- App Store / Play Store wrappers  
- Changing product `lowStockThreshold` model  

---

## Later phases (sketch only)

### Phase 2 — Web Push

- VAPID keys in API env; endpoint to save/remove `PushSubscription` per user.  
- Frontend: request permission after install (or from a Notifications settings row); subscribe and POST to API.  
- Respect mute / opt-out per user.

### Phase 3 — Staff/owner appointment reminders

- Extend existing reminder job patterns (today: **client** email/SMS via ClickSend + email service).  
- New staff/owner targets: email + SMS (if phone on account) + push.  
- Org-configurable lead time (mirror client “hours before” settings).

### Phase 4 — Low inventory % alerts

- Today: fixed `lowStockThreshold` count.  
- Add per-product **capacity / restock max** and **alert percent** (e.g. max 50 → alert at 25% ⇒ qty ≤ 12.5 → use integer floor).  
- On stock change (checkout / adjustment), if crossing threshold, notify opted-in owners/staff via email + SMS + push.  
- Dedupe so the same low-stock event does not spam.

---

## Success criteria (Phase 1)

- Mobile users can add Viselle to the home screen from Settings.  
- Installed app launches fullscreen (`standalone`).  
- PC users never see the control.  
- No secrets committed; staging deploy works over HTTPS.

## Non-goals

- Replacing email/SMS with push-only.  
- Native App Store presence in this initiative.
