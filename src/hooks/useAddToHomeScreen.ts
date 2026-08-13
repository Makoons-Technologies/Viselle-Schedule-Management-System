import { useCallback, useEffect, useState } from 'react';
import {
  getInstallPlatform,
  isMobileDevice,
  isStandaloneDisplay,
  type InstallPlatform,
} from '@/lib/add-to-home-screen';
import {
  getDeferredInstallPrompt,
  promptDeferredInstall,
  subscribeInstallPrompt,
} from '@/lib/pwa-install';

const BANNER_DISMISS_KEY = 'viselle.a2hs-banner.dismissed';

function readBannerDismissed(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(BANNER_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function useAddToHomeScreen() {
  const [canPrompt, setCanPrompt] = useState(() => Boolean(getDeferredInstallPrompt()));
  const [standalone, setStandalone] = useState(() => isStandaloneDisplay());
  const [mobile] = useState(() => isMobileDevice());
  const [platform] = useState<InstallPlatform>(() => getInstallPlatform());
  const [bannerDismissed, setBannerDismissed] = useState(readBannerDismissed);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  useEffect(() => {
    const syncPrompt = () => setCanPrompt(Boolean(getDeferredInstallPrompt()));
    syncPrompt();
    const unsubscribe = subscribeInstallPrompt(syncPrompt);

    const onInstalled = () => {
      setCanPrompt(false);
      setStandalone(true);
    };
    window.addEventListener('appinstalled', onInstalled);
    const mq = window.matchMedia('(display-mode: standalone)');
    const onMq = () => setStandalone(isStandaloneDisplay());
    mq.addEventListener?.('change', onMq);
    return () => {
      unsubscribe();
      window.removeEventListener('appinstalled', onInstalled);
      mq.removeEventListener?.('change', onMq);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const outcome = await promptDeferredInstall();
    if (outcome === 'accepted') setStandalone(true);
    setCanPrompt(Boolean(getDeferredInstallPrompt()));
    return outcome;
  }, []);

  /** Native Chromium prompt when available; otherwise open platform instructions. */
  const handleAddToHomeScreen = useCallback(async () => {
    const outcome = await promptInstall();
    if (outcome !== 'unavailable') return;
    setInstructionsOpen(true);
  }, [promptInstall]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    try {
      sessionStorage.setItem(BANNER_DISMISS_KEY, '1');
    } catch {
      /* private mode */
    }
  }, []);

  const showRow = mobile && !standalone;

  return {
    showRow,
    showBanner: showRow && !bannerDismissed,
    canPrompt,
    platform,
    promptInstall,
    handleAddToHomeScreen,
    instructionsOpen,
    setInstructionsOpen,
    dismissBanner,
  };
}
