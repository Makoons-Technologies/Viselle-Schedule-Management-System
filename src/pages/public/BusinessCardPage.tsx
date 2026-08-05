import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { PageSeo } from '@/components/seo/PageSeo';
import { ViselleLogo } from '@/components/common/ViselleLogo';
import { marketingSeo } from '@/content/marketing-seo';
import { useFoilTilt } from '@/hooks/useFoilTilt';
import {
  GET_STARTED_DISPLAY,
  formatRedeemBy,
  getStartedUrl,
  socialUrl,
} from '@/lib/businessCardAssets';
import { fetchBusinessCardCampaign } from '@/lib/signup';
import { cn } from '@/lib/utils';
import type { TrialCampaign } from '@/types/api';

function CrestSheen({ tilt }: { tilt: { x: number; y: number } }) {
  const posX = Math.round(tilt.x * 100);
  const posY = Math.round(tilt.y * 100);
  return (
    <div
      className="bc-crest-sheen"
      style={{ '--foil-x': `${posX}%`, '--foil-y': `${posY}%` } as CSSProperties}
      aria-hidden
    />
  );
}

function CardFront({ tilt }: { tilt: { x: number; y: number } }) {
  return (
    <div className="bc-face bc-face-front">
      <div className="bc-gradient-drift" aria-hidden />
      <div className="bc-face-inner bc-face-inner-front">
        <div className="bc-brand bc-enter-logo">
          <div className="bc-crest-wrap">
            <ViselleLogo size={118} className="bc-crest" />
            <CrestSheen tilt={tilt} />
          </div>
          <p className="bc-wordmark">Viselle</p>
        </div>
        <div className="bc-front-copy bc-enter-copy">
          <h1 className="bc-headline">Scheduling, Simplified</h1>
          <p className="bc-keywords">
            <span>Appointments</span>
            <span>Clients</span>
            <span>Inventory</span>
            <span>Growth</span>
            <span>Sales</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function CardBack({
  tilt,
  campaign,
  qrDataUrl,
}: {
  tilt: { x: number; y: number };
  campaign: TrialCampaign | null;
  qrDataUrl: string | null;
}) {
  const code = campaign?.code?.trim() || null;
  const redeemBy = formatRedeemBy(campaign?.expiresAt);

  return (
    <div className="bc-face bc-face-back">
      <div className="bc-gradient-drift bc-gradient-drift-back" aria-hidden />
      <div className="bc-back-layout">
        <div className="bc-back-copy bc-enter-copy">
          <p className="bc-offer">Enjoy Three Months Free</p>
          <p className="bc-back-kicker">Exclusive Beta Access</p>
          <p className="bc-back-hint">Scan the QR code or visit</p>
          <p className="bc-back-url">{GET_STARTED_DISPLAY}</p>
          <div className="bc-access-block">
            <p className="bc-access-label">Access Code</p>
            <p className="bc-access-code">{code ?? '————'}</p>
          </div>
          {redeemBy && <p className="bc-redeem-by">Redeem by {redeemBy}</p>}
        </div>
        <div className="bc-qr-wrap bc-enter-logo">
          <div className="bc-qr-frame">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR code to get started with Viselle" className="bc-qr" />
            ) : (
              <div className="bc-qr bc-qr-placeholder" aria-hidden />
            )}
            <CrestSheen tilt={tilt} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BusinessCardPage() {
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('code') ?? searchParams.get('campaign');
  const [campaign, setCampaign] = useState<TrialCampaign | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMotionFallback, setShowMotionFallback] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const { tilt, onPointerMove, onPointerLeave, enableMotion, needsPermission } = useFoilTilt(true);

  useEffect(() => {
    const stage = stageRef.current;
    const onFirstContact = () => {
      void enableMotion();
    };
    window.addEventListener('pointerdown', onFirstContact, { capture: true, once: true });
    window.addEventListener('touchstart', onFirstContact, { capture: true, once: true, passive: true });
    stage?.addEventListener('pointerdown', onFirstContact, { once: true });
    stage?.addEventListener('touchstart', onFirstContact, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstContact, true);
      window.removeEventListener('touchstart', onFirstContact, true);
      stage?.removeEventListener('pointerdown', onFirstContact);
      stage?.removeEventListener('touchstart', onFirstContact);
    };
  }, [enableMotion]);

  useEffect(() => {
    if (!needsPermission) {
      setShowMotionFallback(false);
      return;
    }
    const timer = window.setTimeout(() => setShowMotionFallback(true), 2200);
    return () => window.clearTimeout(timer);
  }, [needsPermission]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBusinessCardCampaign(codeParam)
      .then((result) => {
        if (!cancelled) setCampaign(result);
      })
      .catch(() => {
        if (!cancelled) setCampaign(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [codeParam]);

  useEffect(() => {
    let cancelled = false;
    const url = getStartedUrl(campaign?.code);
    QRCode.toDataURL(url, {
      width: 280,
      margin: 1,
      color: { dark: '#0a0a0a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [campaign?.code]);

  const handlePointer = (event: PointerEvent<HTMLButtonElement>) => {
    const el = cardRef.current;
    if (!el) return;
    onPointerMove(event.clientX, event.clientY, el.getBoundingClientRect(), event.pointerType);
  };

  const shareHref = socialUrl(campaign?.code ?? codeParam);

  return (
    <div className="bc-page bg-marketing">
      <PageSeo {...marketingSeo.businessCard} />
      <style>{businessCardCss}</style>

      <header className="bc-chrome">
        <Link to="/" className="bc-chrome-brand" aria-label="Viselle home">
          <ViselleLogo size={28} />
          <span>Viselle</span>
        </Link>
        <div className="bc-chrome-actions">
          <Link to={shareHref} className="bc-chrome-link">
            Social
          </Link>
          <Link to={getStartedUrl(campaign?.code)} className="bc-chrome-cta">
            Get started
          </Link>
        </div>
      </header>

      <main
        ref={stageRef}
        className="bc-stage"
        onPointerDown={() => void enableMotion()}
        onTouchStart={() => void enableMotion()}
      >
        <button
          type="button"
          className={cn('bc-card-scene is-landscape', flipped && 'is-flipped')}
          aria-label={flipped ? 'Show front of business card' : 'Show back of business card'}
          onClick={() => {
            setFlipped((v) => !v);
            void enableMotion();
          }}
          onPointerDown={() => void enableMotion()}
          onPointerMove={handlePointer}
          onPointerLeave={onPointerLeave}
        >
          <div ref={cardRef} className="bc-card">
            <CardFront tilt={tilt} />
            <CardBack tilt={tilt} campaign={campaign} qrDataUrl={qrDataUrl} />
          </div>
        </button>

        <div className="bc-controls">
          <p className="bc-hint">{loading ? 'Loading campaign…' : 'Tap the card to flip'}</p>
        </div>
        {showMotionFallback && needsPermission && (
          <button type="button" className="bc-motion-fallback" onClick={() => void enableMotion()}>
            Allow motion for tilt
          </button>
        )}
      </main>
    </div>
  );
}

const businessCardCss = `
.bc-page {
  --bc-magenta: var(--color-bc-magenta, #c0267a);
  --bc-magenta-deep: var(--color-bc-magenta-deep, #9b2c77);
  --bc-indigo: var(--color-bc-indigo, #1e1b4b);
  --bc-navy: var(--color-bc-navy, #0f172a);
  --bc-foil-1: #fdda74;
  --bc-foil-2: #b38524;
  --bc-foil-3: #ecd068;
  --bc-foil-4: #9f690a;
  --bc-foil-5: #fdeb83;
  --bc-foil-6: #b88017;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  color: #fff;
  font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
  overflow-x: hidden;
}

.bc-chrome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  z-index: 2;
}

.bc-chrome-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  letter-spacing: 0.04em;
  font-size: 0.95rem;
}

.bc-chrome-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
}

.bc-chrome-link {
  color: rgba(253, 235, 131, 0.88);
  text-decoration: none;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.35rem 0.45rem;
}

.bc-chrome-link:hover {
  color: #fdeb83;
}

.bc-chrome-cta {
  color: rgba(255, 255, 255, 0.92);
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  transition: background 180ms ease, border-color 180ms ease;
}

.bc-chrome-cta:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.45);
}

.bc-motion-fallback {
  appearance: none;
  border: 0;
  background: transparent;
  color: rgba(253, 235, 131, 0.72);
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: underline;
  text-underline-offset: 0.2em;
  cursor: pointer;
  padding: 0.15rem 0.35rem;
}

.bc-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem 2rem;
  gap: 1.25rem;
}

.bc-card-scene {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  perspective: 1400px;
  -webkit-perspective: 1400px;
  -webkit-tap-highlight-color: transparent;
}

.bc-card-scene.is-landscape {
  width: min(92vw, 560px);
  aspect-ratio: 1.75 / 1;
}

.bc-card {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
  transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
  border-radius: clamp(12px, 2.2vw, 18px);
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.06);
}

.bc-card-scene.is-flipped .bc-card {
  transform: rotateY(180deg);
}

.bc-face {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -webkit-transform-style: flat;
  transform-style: flat;
}

.bc-face-front {
  background: linear-gradient(135deg, var(--bc-magenta) 0%, var(--bc-magenta-deep) 28%, var(--bc-indigo) 72%, var(--bc-navy) 100%);
  transform: rotateY(0deg);
  -webkit-transform: rotateY(0deg);
  z-index: 2;
}

.bc-face-back {
  background: linear-gradient(105deg, var(--bc-indigo) 0%, var(--color-bc-violet, #4c1d95) 42%, var(--bc-magenta) 100%);
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg);
  z-index: 1;
}

.bc-gradient-drift {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(circle at 20% 30%, rgba(253, 218, 116, 0.12), transparent 42%),
    radial-gradient(circle at 80% 70%, rgba(192, 38, 122, 0.35), transparent 45%);
  animation: bc-drift 14s ease-in-out infinite alternate;
  pointer-events: none;
}

.bc-gradient-drift-back {
  background:
    radial-gradient(circle at 75% 40%, rgba(253, 218, 116, 0.1), transparent 40%),
    radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.28), transparent 48%);
}

@keyframes bc-drift {
  from { opacity: 0.85; }
  to { opacity: 1; }
}

.bc-face-inner {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(0.45rem, 1.8vw, 0.85rem);
  padding: clamp(0.9rem, 3vw, 1.5rem) clamp(1rem, 3.2vw, 1.75rem);
  text-align: center;
  box-sizing: border-box;
}

.bc-face-inner-front {
  justify-content: center;
  gap: clamp(0.55rem, 2vw, 1rem);
}

.bc-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  flex-shrink: 0;
}

.bc-crest-wrap {
  position: relative;
  width: clamp(72px, 18vw, 118px);
  height: clamp(72px, 18vw, 118px);
}

.bc-crest {
  display: block;
  width: 100% !important;
  height: 100% !important;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.3));
}

.bc-crest-sheen {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at var(--foil-x, 50%) var(--foil-y, 50%),
    rgba(253, 235, 131, 0.55) 0%,
    rgba(253, 218, 116, 0.28) 22%,
    transparent 48%
  );
  mix-blend-mode: soft-light;
  pointer-events: none;
  animation: bc-sheen-pulse 4.5s ease-in-out infinite alternate;
}

.bc-wordmark {
  margin: 0;
  font-family: "Cormorant Garamond", "Times New Roman", Georgia, serif;
  font-style: italic;
  font-weight: 600;
  font-size: clamp(1.35rem, 4.2vw, 2rem);
  letter-spacing: 0.06em;
  line-height: 1.1;
  background: linear-gradient(115deg, var(--bc-foil-1), var(--bc-foil-2) 40%, var(--bc-foil-3));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.bc-front-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  max-width: 100%;
}

.bc-headline {
  margin: 0;
  font-size: clamp(0.85rem, 2.8vw, 1.25rem);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  line-height: 1.25;
  max-width: 100%;
  color: rgba(255, 255, 255, 0.96);
}

.bc-keywords {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  row-gap: 0.3rem;
  column-gap: clamp(0.55rem, 1.8vw, 1rem);
  font-size: clamp(0.52rem, 1.5vw, 0.72rem);
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.82);
  max-width: 92%;
}

.bc-keywords span {
  white-space: nowrap;
}

.bc-back-layout {
  position: relative;
  z-index: 2;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) auto;
  align-items: center;
  gap: clamp(0.75rem, 2.4vw, 1.35rem);
  padding: clamp(0.95rem, 2.8vw, 1.45rem) clamp(1.1rem, 3.2vw, 1.65rem);
  box-sizing: border-box;
}

.bc-back-copy {
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.28rem;
  min-width: 0;
}

.bc-offer {
  margin: 0 0 0.2rem;
  font-family: "Great Vibes", "Cormorant Garamond", Georgia, cursive;
  font-size: clamp(1.35rem, 4.2vw, 2.05rem);
  font-weight: 400;
  letter-spacing: 0.02em;
  line-height: 1.15;
  background: linear-gradient(115deg, var(--bc-foil-1), var(--bc-foil-2) 45%, var(--bc-foil-3));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.bc-back-kicker {
  margin: 0 0 0.15rem;
  font-size: clamp(0.68rem, 1.9vw, 0.95rem);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  line-height: 1.25;
  color: rgba(255, 255, 255, 0.96);
}

.bc-back-hint {
  margin: 0;
  font-size: clamp(0.55rem, 1.45vw, 0.7rem);
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.78);
}

.bc-back-url {
  margin: 0.05rem 0 0.35rem;
  font-size: clamp(0.62rem, 1.75vw, 0.92rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  word-break: break-word;
  max-width: 100%;
  color: rgba(255, 255, 255, 0.96);
}

.bc-access-block {
  margin-top: 0.1rem;
}

.bc-access-label {
  margin: 0;
  font-size: clamp(0.52rem, 1.4vw, 0.65rem);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.68);
}

.bc-access-code {
  margin: 0.15rem 0 0;
  font-size: clamp(0.95rem, 2.6vw, 1.3rem);
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.98);
}

.bc-redeem-by {
  margin: 0.4rem 0 0;
  font-size: clamp(0.52rem, 1.4vw, 0.65rem);
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.72);
}

.bc-qr-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  align-self: center;
}

.bc-qr-frame {
  position: relative;
  border-radius: 12px;
  padding: 3px;
  background: linear-gradient(145deg, var(--bc-foil-1), var(--bc-foil-2) 40%, var(--bc-foil-3));
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.bc-qr-frame .bc-crest-sheen {
  border-radius: 10px;
  mix-blend-mode: soft-light;
  opacity: 0.55;
}

.bc-qr {
  width: min(100%, 118px);
  aspect-ratio: 1;
  border-radius: 10px;
  background: #fff;
  padding: 6px;
  box-sizing: border-box;
  display: block;
}

.bc-qr-placeholder {
  background: rgba(255, 255, 255, 0.85);
}

@keyframes bc-sheen-pulse {
  from { opacity: 0.45; }
  to { opacity: 0.9; }
}

.bc-enter-logo {
  animation: bc-enter 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.bc-enter-copy {
  animation: bc-enter 1100ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both;
}

@keyframes bc-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}

.bc-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
}

.bc-hint {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

@media (max-width: 520px) {
  .bc-card-scene.is-landscape {
    width: min(94vw, 420px);
    aspect-ratio: 1.55 / 1;
  }

  .bc-face-inner {
    gap: 0.4rem;
    padding: 0.75rem 0.7rem;
  }

  .bc-crest-wrap {
    width: 68px;
    height: 68px;
  }

  .bc-wordmark {
    font-size: 1.2rem;
  }

  .bc-headline {
    font-size: clamp(0.72rem, 3.2vw, 0.9rem);
    letter-spacing: 0.1em;
  }

  .bc-keywords {
    font-size: clamp(0.46rem, 2vw, 0.58rem);
    letter-spacing: 0.08em;
    column-gap: 0.45rem;
    max-width: 100%;
  }

  .bc-back-layout {
    gap: 0.55rem;
    padding: 0.7rem 0.7rem;
  }

  .bc-offer {
    font-size: 1.15rem;
  }

  .bc-back-kicker {
    font-size: 0.62rem;
    letter-spacing: 0.1em;
  }

  .bc-back-url {
    font-size: 0.58rem;
    letter-spacing: 0.06em;
  }

  .bc-access-code {
    font-size: 0.9rem;
    letter-spacing: 0.1em;
  }

  .bc-qr {
    width: 78px;
    padding: 4px;
    border-radius: 7px;
  }

  .bc-qr-frame {
    border-radius: 9px;
    padding: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bc-card,
  .bc-gradient-drift,
  .bc-crest-sheen,
  .bc-enter-logo,
  .bc-enter-copy {
    animation: none !important;
    transition: none !important;
  }
}
`;
