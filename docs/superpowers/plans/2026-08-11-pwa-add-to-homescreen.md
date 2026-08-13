# PWA Add to Home Screen (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Viselle installable as a fullscreen PWA and add a mobile-only Settings “Add to Home Screen” action.

**Architecture:** Static manifest + minimal service worker for installability; pure detection helpers + React hook; Settings hub row that prompts on Android or shows iOS/Android instructions via Dialog.

**Tech Stack:** Vite + React + TypeScript, existing Radix Dialog / lucide icons, hand-rolled service worker (no `vite-plugin-pwa`).

## Global Constraints

- Phase 1 only — no push, no backend, no App Store.
- Hide control on PC; hide when already `standalone`.
- iOS cannot one-tap install — instructions only.
- Do not block app boot if SW registration fails.
- Production domains remain `viselle.net` / `staging.viselle.net` (never invent `viselle.app`).
- No unit test runner in repo — verify with `npm run build` and manual checks.

## File map

| File | Responsibility |
|------|----------------|
| `public/pwa-192.png`, `public/pwa-512.png` | PWA icons (from existing logo assets) |
| `public/manifest.webmanifest` | Install metadata, `display: standalone` |
| `public/sw.js` | Minimal SW (install + activate; no offline cache of API) |
| `src/lib/register-sw.ts` | Register SW; swallow/log failures |
| `src/lib/add-to-home-screen.ts` | Pure helpers: mobile, standalone, platform |
| `src/hooks/useAddToHomeScreen.ts` | Prompt, `beforeinstallprompt`, `promptInstall` |
| `src/components/settings/AddToHomeScreenDialog.tsx` | iOS / Android instruction copy |
| `src/pages/org/settings/SettingsHubPage.tsx` | Mobile-only row |
| `src/main.tsx` | Call `registerServiceWorker()` |
| `index.html` | Manifest link + iOS meta tags |

---

### Task 1: Icons + manifest + service worker + HTML

**Files:**
- Create: `public/pwa-192.png`, `public/pwa-512.png`, `public/manifest.webmanifest`, `public/sw.js`, `src/lib/register-sw.ts`
- Modify: `index.html`, `src/main.tsx`

**Interfaces:**
- Produces: `registerServiceWorker(): void` in `src/lib/register-sw.ts`

- [ ] **Step 1: Generate PWA icons from `public/apple-touch-icon.png` (or `viselle-logo.png`)**

PowerShell (System.Drawing): write 192×192 and 512×512 PNGs to `public/pwa-192.png` and `public/pwa-512.png` (letterbox/center on transparent or white background if source is smaller).

- [ ] **Step 2: Add `public/manifest.webmanifest`**

```json
{
  "name": "Viselle",
  "short_name": "Viselle",
  "description": "Scheduling for salons, spas, and beauty studios",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#fafaf9",
  "theme_color": "#1c1917",
  "icons": [
    {
      "src": "/pwa-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/pwa-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/pwa-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

- [ ] **Step 3: Add minimal `public/sw.js`**

```js
/* Viselle PWA — installability only (Phase 1). No offline API cache. */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
```

- [ ] **Step 4: Add `src/lib/register-sw.ts`**

```ts
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[pwa] service worker registration failed', err);
    });
  });
}
```

- [ ] **Step 5: Wire `index.html` + `main.tsx`**

In `index.html` `<head>` (keep existing icons):

```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#1c1917" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Viselle" />
```

In `src/main.tsx` after other init calls:

```ts
import { registerServiceWorker } from '@/lib/register-sw';
registerServiceWorker();
```

- [ ] **Step 6: Verify build still typechecks icons/static files**

Run: `npm run build`  
Expected: success (SW/manifest are static public assets).

- [ ] **Step 7: Commit**

```powershell
git add public/pwa-192.png public/pwa-512.png public/manifest.webmanifest public/sw.js src/lib/register-sw.ts index.html src/main.tsx
git commit -m @"
Add PWA manifest, icons, and minimal service worker.

Enables installable standalone shell for later Add to Home Screen UI.
"@
```

---

### Task 2: Detection helpers + hook

**Files:**
- Create: `src/lib/add-to-home-screen.ts`, `src/hooks/useAddToHomeScreen.ts`

**Interfaces:**
- Consumes: browser `navigator` / `matchMedia` / `beforeinstallprompt`
- Produces:
  - `isStandaloneDisplay(): boolean`
  - `isMobileDevice(): boolean`
  - `getInstallPlatform(): 'ios' | 'android' | 'other'`
  - `useAddToHomeScreen(): { showRow: boolean; canPrompt: boolean; platform: 'ios' | 'android' | 'other'; promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>; }`

- [ ] **Step 1: Implement `src/lib/add-to-home-screen.ts`**

```ts
export type InstallPlatform = 'ios' | 'android' | 'other';

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  // Require phone/tablet UA (or iPadOS) — not desktop with a touch screen alone
  return mobileUa || iPadOs || (coarse && /Mobile|Tablet/i.test(ua));
}

export function getInstallPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || iPadOs) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}
```

- [ ] **Step 2: Implement `src/hooks/useAddToHomeScreen.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import {
  getInstallPlatform,
  isMobileDevice,
  isStandaloneDisplay,
  type InstallPlatform,
} from '@/lib/add-to-home-screen';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function useAddToHomeScreen() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(() => isStandaloneDisplay());
  const [mobile] = useState(() => isMobileDevice());
  const [platform] = useState<InstallPlatform>(() => getInstallPlatform());

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    const mq = window.matchMedia('(display-mode: standalone)');
    const onMq = () => setStandalone(isStandaloneDisplay());
    mq.addEventListener?.('change', onMq);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
      mq.removeEventListener?.('change', onMq);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable';
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome;
  }, [deferred]);

  return {
    showRow: mobile && !standalone,
    canPrompt: Boolean(deferred),
    platform,
    promptInstall,
  };
}
```

- [ ] **Step 3: Run `npm run build`**

Expected: PASS

- [ ] **Step 4: Commit**

```powershell
git add src/lib/add-to-home-screen.ts src/hooks/useAddToHomeScreen.ts
git commit -m @"
Add mobile/standalone detection for Add to Home Screen.

Keeps the Settings affordance off PC and out of installed standalone sessions.
"@
```

---

### Task 3: Instructions dialog + Settings hub row

**Files:**
- Create: `src/components/settings/AddToHomeScreenDialog.tsx`
- Modify: `src/pages/org/settings/SettingsHubPage.tsx`

**Interfaces:**
- Consumes: `useAddToHomeScreen()` from Task 2; Dialog UI primitives
- Produces: Settings row labeled “Add to Home Screen”

- [ ] **Step 1: Create `AddToHomeScreenDialog.tsx`**

Props: `open: boolean; onOpenChange: (open: boolean) => void; platform: InstallPlatform`

- iOS copy: tap Share → Add to Home Screen  
- Android / other copy: Chrome menu (⋮) → Install app / Add to Home screen  
- Use existing `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`

- [ ] **Step 2: Update `SettingsHubPage.tsx`**

After the existing groups list (or as a final group inside the same panel):

- If `showRow`, render a button row matching Link styling (`Smartphone` or `Download` icon, chevron optional or omit).
- On click: if `canPrompt`, `await promptInstall()`; if result is `unavailable` or platform is `ios`, open dialog.
- Prefer: `canPrompt` → native prompt; else → open instructions dialog.

- [ ] **Step 3: Run `npm run build`**

Expected: PASS

- [ ] **Step 4: Commit + push staging**

```powershell
git add src/components/settings/AddToHomeScreenDialog.tsx src/pages/org/settings/SettingsHubPage.tsx
git commit -m @"
Add Settings Add to Home Screen for phones and tablets.

Uses the Android install prompt when available and guided steps on iOS.
"@
git push -u origin staging
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| manifest `standalone` + icons | 1 |
| Minimal SW + non-blocking register | 1 |
| iOS meta + existing apple-touch-icon | 1 |
| Mobile-only / hide standalone | 2 + 3 |
| Android prompt + iOS instructions | 3 |
| Settings hub row | 3 |
| No push / no backend | (out of scope — omitted) |

## Self-review

- No TBD placeholders.  
- Hook return shape matches Settings usage.  
- Verification is `npm run build` (no vitest in repo).
