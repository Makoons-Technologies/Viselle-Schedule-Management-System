import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { PageSeo } from '@/components/seo/PageSeo';
import { ViselleLogo } from '@/components/common/ViselleLogo';
import { marketingSeo } from '@/content/marketing-seo';
import { useFoilTilt } from '@/hooks/useFoilTilt';
import {
  BC_CREST_MASK_SRC,
  BC_SCRIPT_MASK_SRC,
  BC_WORDMARK_MASK_SRC,
  GET_STARTED_DISPLAY,
  formatRedeemBy,
  getStartedUrl,
  socialUrl,
} from '@/lib/businessCardAssets';
import { fetchBusinessCardCampaign } from '@/lib/signup';
import { cn } from '@/lib/utils';
import type { TrialCampaign } from '@/types/api';

/** Animated gold foil revealed through a silhouette mask (crest, wordmark, script). */
function FoilMasked({
  maskSrc,
  tilt,
  className,
  label,
}: {
  maskSrc: string;
  tilt: { x: number; y: number };
  className?: string;
  label?: string;
}) {
  const posX = Math.round(tilt.x * 100);
  const posY = Math.round(tilt.y * 100);
  return (
    <div
      className={cn('bc-foil', className)}
      style={
        {
          '--foil-x': `${posX}%`,
          '--foil-y': `${posY}%`,
          '--bc-mask': `url('${maskSrc}')`,
        } as CSSProperties
      }
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

function CardFront({ tilt }: { tilt: { x: number; y: number } }) {
  return (
    <div className="bc-face bc-face-front">
      <div className="bc-gradient-drift" aria-hidden />
      <div className="bc-face-inner bc-face-inner-front">
        <div className="bc-brand bc-enter-logo">
          <FoilMasked
            maskSrc={BC_CREST_MASK_SRC}
            tilt={tilt}
            className="bc-foil-crest"
            label="Viselle crest"
          />
          <FoilMasked
            maskSrc={BC_WORDMARK_MASK_SRC}
            tilt={tilt}
            className="bc-foil-wordmark"
            label="Viselle"
          />
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
  const posX = Math.round(tilt.x * 100);
  const posY = Math.round(tilt.y * 100);

  return (
    <div className="bc-face bc-face-back">
      <div className="bc-gradient-drift bc-gradient-drift-back" aria-hidden />
      <div className="bc-back-layout">
        <div className="bc-back-copy bc-enter-copy">
          <FoilMasked
            maskSrc={BC_SCRIPT_MASK_SRC}
            tilt={tilt}
            className="bc-foil-script"
            label="Enjoy Three Months Free"
          />
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
          <div
            className="bc-qr-frame"
            style={{ '--foil-x': `${posX}%`, '--foil-y': `${posY}%` } as CSSProperties}
          >
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR code to get started with Viselle" className="bc-qr" />
            ) : (
              <div className="bc-qr bc-qr-placeholder" aria-hidden />
            )}
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
      width: 320,
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
  --bc-foil-grad:
    linear-gradient(
      115deg,
      var(--bc-foil-1) 0%,
      var(--bc-foil-2) 16%,
      var(--bc-foil-3) 32%,
      var(--bc-foil-4) 48%,
      var(--bc-foil-5) 64%,
      var(--bc-foil-6) 80%,
      var(--bc-foil-1) 100%
    );
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
  padding: 0.85rem 1.15rem;
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
  padding: 0.35rem 0.75rem 1.5rem;
  gap: 1rem;
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
  width: min(96vw, 680px);
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

/* Shared metallic foil: silhouette mask + animated gold + tilt highlight */
.bc-foil {
  display: block;
  flex-shrink: 0;
  background-image:
    radial-gradient(
      circle at var(--foil-x, 50%) var(--foil-y, 50%),
      rgba(255, 248, 210, 0.95) 0%,
      rgba(253, 235, 131, 0.55) 18%,
      rgba(253, 218, 116, 0.22) 34%,
      transparent 52%
    ),
    var(--bc-foil-grad);
  background-size: 160% 160%, 280% 280%;
  background-position:
    var(--foil-x, 50%) var(--foil-y, 50%),
    0% 50%;
  background-repeat: no-repeat;
  animation: bc-foil-shift 5.5s ease-in-out infinite alternate;
  -webkit-mask-image: var(--bc-mask);
  mask-image: var(--bc-mask);
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-mode: alpha;
  mask-mode: alpha;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.28));
  will-change: background-position;
}

@keyframes bc-foil-shift {
  from {
    background-position:
      var(--foil-x, 50%) var(--foil-y, 50%),
      8% 40%;
  }
  to {
    background-position:
      var(--foil-x, 50%) var(--foil-y, 50%),
      88% 60%;
  }
}

.bc-face-inner {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(0.35rem, 1.4vw, 0.7rem);
  padding: clamp(0.55rem, 2vw, 1rem) clamp(0.7rem, 2.4vw, 1.2rem);
  text-align: center;
  box-sizing: border-box;
}

.bc-face-inner-front {
  justify-content: center;
  gap: clamp(0.4rem, 1.6vw, 0.75rem);
}

.bc-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.05rem, 0.6vw, 0.2rem);
  flex-shrink: 0;
  width: min(78%, 340px);
}

.bc-foil-crest {
  width: min(100%, clamp(118px, 30vw, 178px));
  aspect-ratio: 710.72 / 611.16;
}

.bc-foil-wordmark {
  width: min(92%, clamp(160px, 42vw, 250px));
  aspect-ratio: 298 / 61;
  margin-top: -0.05rem;
}

.bc-front-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  max-width: 100%;
}

.bc-headline {
  margin: 0;
  font-size: clamp(0.95rem, 3.1vw, 1.4rem);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.2;
  max-width: 100%;
  color: rgba(255, 255, 255, 0.96);
}

.bc-keywords {
  margin: 0;
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  gap: clamp(0.4rem, 1.5vw, 0.85rem);
  font-size: clamp(0.5rem, 1.45vw, 0.78rem);
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.82);
  max-width: 100%;
  overflow: hidden;
}

.bc-keywords span {
  white-space: nowrap;
}

.bc-back-layout {
  position: relative;
  z-index: 2;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) auto;
  align-items: center;
  gap: clamp(0.65rem, 2.2vw, 1.25rem);
  padding: clamp(0.65rem, 2.2vw, 1.15rem) clamp(0.8rem, 2.6vw, 1.35rem);
  box-sizing: border-box;
}

.bc-back-copy {
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.22rem;
  min-width: 0;
}

.bc-foil-script {
  width: min(100%, clamp(220px, 52vw, 340px));
  aspect-ratio: 726 / 75;
  margin: 0 0 0.15rem;
  align-self: stretch;
}

.bc-back-kicker {
  margin: 0 0 0.1rem;
  font-size: clamp(0.78rem, 2.15vw, 1.08rem);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.25;
  color: rgba(255, 255, 255, 0.96);
}

.bc-back-hint {
  margin: 0;
  font-size: clamp(0.58rem, 1.5vw, 0.75rem);
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.78);
}

.bc-back-url {
  margin: 0.05rem 0 0.3rem;
  font-size: clamp(0.7rem, 1.9vw, 1rem);
  font-weight: 700;
  letter-spacing: 0.07em;
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
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(1rem, 2.8vw, 1.4rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.98);
  font-variant-ligatures: none;
}

.bc-redeem-by {
  margin: 0.35rem 0 0;
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
  border-radius: 14px;
  padding: 3px;
  background-image:
    radial-gradient(
      circle at var(--foil-x, 50%) var(--foil-y, 50%),
      rgba(255, 248, 210, 0.95) 0%,
      rgba(253, 235, 131, 0.45) 22%,
      transparent 48%
    ),
    var(--bc-foil-grad);
  background-size: 160% 160%, 280% 280%;
  background-position:
    var(--foil-x, 50%) var(--foil-y, 50%),
    0% 50%;
  animation: bc-foil-shift 5.5s ease-in-out infinite alternate;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.bc-qr {
  width: min(100%, clamp(112px, 28vw, 158px));
  aspect-ratio: 1;
  border-radius: 11px;
  background: #fff;
  padding: 7px;
  box-sizing: border-box;
  display: block;
}

.bc-qr-placeholder {
  background: rgba(255, 255, 255, 0.85);
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
    width: min(96vw, 460px);
    aspect-ratio: 1.55 / 1;
  }

  .bc-face-inner {
    gap: 0.3rem;
    padding: 0.5rem 0.55rem;
  }

  .bc-brand {
    width: min(86%, 280px);
  }

  .bc-foil-crest {
    width: min(100%, 118px);
  }

  .bc-foil-wordmark {
    width: min(96%, 168px);
  }

  .bc-headline {
    font-size: clamp(0.72rem, 3.1vw, 0.92rem);
    letter-spacing: 0.09em;
  }

  .bc-keywords {
    font-size: clamp(0.42rem, 1.9vw, 0.55rem);
    letter-spacing: 0.06em;
    gap: 0.32rem;
  }

  .bc-back-layout {
    gap: 0.45rem;
    padding: 0.55rem 0.55rem;
  }

  .bc-foil-script {
    width: min(100%, 210px);
  }

  .bc-back-kicker {
    font-size: 0.62rem;
    letter-spacing: 0.09em;
  }

  .bc-back-url {
    font-size: 0.58rem;
    letter-spacing: 0.05em;
  }

  .bc-access-code {
    font-size: 0.88rem;
    letter-spacing: 0.06em;
  }

  .bc-qr {
    width: 92px;
    padding: 5px;
    border-radius: 8px;
  }

  .bc-qr-frame {
    border-radius: 10px;
    padding: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bc-card,
  .bc-gradient-drift,
  .bc-foil,
  .bc-qr-frame,
  .bc-enter-logo,
  .bc-enter-copy {
    animation: none !important;
    transition: none !important;
  }
}
`;
