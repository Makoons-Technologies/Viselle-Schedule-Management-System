import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { PageSeo } from '@/components/seo/PageSeo';
import { ViselleLogo, VISELLE_LOGO_PNG_SRC } from '@/components/common/ViselleLogo';
import { marketingSeo } from '@/content/marketing-seo';
import { useFoilTilt } from '@/hooks/useFoilTilt';
import { fetchBusinessCardCampaign } from '@/lib/signup';
import { cn } from '@/lib/utils';
import type { TrialCampaign } from '@/types/api';

const GET_STARTED_DISPLAY = 'VISELLE.NET/GET-STARTED';

function formatRedeemBy(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function getStartedUrl(code?: string | null) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://viselle.net';
  if (!code) return `${origin}/get-started`;
  return `${origin}/get-started?code=${encodeURIComponent(code)}`;
}

function FoilText({
  children,
  tilt,
  className,
}: {
  children: ReactNode;
  tilt: { x: number; y: number };
  className?: string;
}) {
  const posX = Math.round(tilt.x * 100);
  const posY = Math.round(tilt.y * 100);
  return (
    <span
      className={cn('bc-foil-text', className)}
      style={
        {
          '--foil-x': `${posX}%`,
          '--foil-y': `${posY}%`,
        } as CSSProperties
      }
    >
      {children}
    </span>
  );
}

function FoilLogo({ tilt, size }: { tilt: { x: number; y: number }; size: number }) {
  const posX = Math.round(tilt.x * 100);
  const posY = Math.round(tilt.y * 100);
  return (
    <div
      className="bc-foil-logo bc-enter-logo"
      style={
        {
          width: size,
          height: size,
          '--foil-x': `${posX}%`,
          '--foil-y': `${posY}%`,
        } as CSSProperties
      }
    >
      <img
        src={VISELLE_LOGO_PNG_SRC}
        alt="Viselle"
        width={size}
        height={size}
        className="h-full w-full object-contain"
        decoding="async"
      />
      <div className="bc-foil-sheen" aria-hidden />
    </div>
  );
}

function CardFront({ tilt }: { tilt: { x: number; y: number } }) {
  return (
    <div className="bc-face bc-face-front">
      <div className="bc-gradient-drift" aria-hidden />
      <div className="bc-face-inner">
        <FoilLogo tilt={tilt} size={132} />
        <div className="bc-front-copy bc-enter-copy">
          <h1 className="bc-headline">
            <FoilText tilt={tilt}>SCHEDULING, SIMPLIFIED</FoilText>
          </h1>
          <p className="bc-keywords">
            <span>APPOINTMENTS</span>
            <span>CLIENTS</span>
            <span>INVENTORY</span>
          </p>
          <p className="bc-keywords bc-keywords-second">
            <span>GROWTH</span>
            <span>SALES</span>
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
        <div className="bc-back-copy">
          <p className="bc-back-kicker">
            <FoilText tilt={tilt}>EXCLUSIVE BETA ACCESS</FoilText>
          </p>
          <p className="bc-back-hint">Scan the QR code or visit</p>
          <p className="bc-back-url">
            <FoilText tilt={tilt}>{GET_STARTED_DISPLAY}</FoilText>
          </p>
          <div className="bc-access-block">
            <p className="bc-access-label">ACCESS CODE</p>
            <p className="bc-access-code">{code ?? '————'}</p>
          </div>
          {redeemBy && <p className="bc-redeem-by">REDEEM BY {redeemBy}</p>}
        </div>
        <div className="bc-qr-wrap">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR code to get started with Viselle" className="bc-qr" />
          ) : (
            <div className="bc-qr bc-qr-placeholder" aria-hidden />
          )}
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
  const cardRef = useRef<HTMLDivElement>(null);
  const { tilt, onPointerMove, onPointerLeave, enableMotion } = useFoilTilt(true);

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
    onPointerMove(event.clientX, event.clientY, el.getBoundingClientRect());
  };

  return (
    <div className="bc-page">
      <PageSeo {...marketingSeo.businessCard} />
      <style>{businessCardCss}</style>

      <header className="bc-chrome">
        <Link to="/" className="bc-chrome-brand" aria-label="Viselle home">
          <ViselleLogo size={28} />
          <span>Viselle</span>
        </Link>
        <Link to={getStartedUrl(campaign?.code)} className="bc-chrome-cta">
          Get started
        </Link>
      </header>

      <main className="bc-stage">
        <button
          type="button"
          className={cn('bc-card-scene', flipped && 'is-flipped')}
          aria-label={flipped ? 'Show front of business card' : 'Show back of business card'}
          onClick={() => {
            setFlipped((v) => !v);
            void enableMotion();
          }}
          onPointerMove={handlePointer}
          onPointerLeave={onPointerLeave}
        >
          <div ref={cardRef} className="bc-card">
            <CardFront tilt={tilt} />
            <CardBack tilt={tilt} campaign={campaign} qrDataUrl={qrDataUrl} />
          </div>
        </button>

        <p className="bc-hint">{loading ? 'Loading campaign…' : 'Tap the card to flip'}</p>
      </main>
    </div>
  );
}

const businessCardCss = `
.bc-page {
  /* Homepage marketing brand scale (src/index.css --color-brand-*) */
  --bc-rose: #c45b8a;       /* brand-500 */
  --bc-rose-deep: #a84372;  /* brand-600 */
  --bc-plum: #8a335d;       /* brand-700 */
  --bc-plum-mid: #5a2240;   /* brand-800 */
  --bc-plum-dark: #4a1a32;  /* brand-900 */
  --bc-ink: #2a0f1e;        /* brand-950 */
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
  background:
    radial-gradient(120% 80% at 10% 0%, rgba(196, 91, 138, 0.42), transparent 55%),
    radial-gradient(100% 70% at 100% 100%, rgba(74, 26, 50, 0.85), transparent 50%),
    linear-gradient(160deg, #2a0f1e 0%, #4a1a32 48%, #5a2240 100%);
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
  width: min(92vw, 560px);
  aspect-ratio: 1.75 / 1;
  perspective: 1400px;
  -webkit-tap-highlight-color: transparent;
}

.bc-card {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
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
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.bc-face-front {
  background: linear-gradient(
    135deg,
    var(--bc-rose) 0%,
    var(--bc-rose-deep) 26%,
    var(--bc-plum) 58%,
    var(--bc-ink) 100%
  );
}

.bc-face-back {
  background: linear-gradient(
    105deg,
    var(--bc-ink) 0%,
    var(--bc-plum-mid) 38%,
    var(--bc-plum) 68%,
    var(--bc-rose) 100%
  );
  transform: rotateY(180deg);
}

.bc-gradient-drift {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(circle at 20% 30%, rgba(253, 218, 116, 0.12), transparent 42%),
    radial-gradient(circle at 80% 70%, rgba(196, 91, 138, 0.32), transparent 45%);
  animation: bc-drift 14s ease-in-out infinite alternate;
  pointer-events: none;
}

.bc-gradient-drift-back {
  background:
    radial-gradient(circle at 75% 40%, rgba(253, 218, 116, 0.1), transparent 40%),
    radial-gradient(circle at 20% 80%, rgba(138, 51, 93, 0.34), transparent 48%);
}

@keyframes bc-drift {
  from { transform: translate3d(-2%, -1%, 0) scale(1.02); }
  to { transform: translate3d(3%, 2%, 0) scale(1.08); }
}

.bc-face-inner {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(0.75rem, 2.5vw, 1.4rem);
  padding: clamp(1rem, 3vw, 1.75rem);
  text-align: center;
}

.bc-front-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
}

.bc-headline {
  margin: 0;
  font-size: clamp(1.05rem, 3.4vw, 1.65rem);
  font-weight: 700;
  letter-spacing: 0.14em;
  line-height: 1.15;
}

.bc-keywords {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: clamp(0.65rem, 2.4vw, 1.35rem);
  font-size: clamp(0.58rem, 1.7vw, 0.78rem);
  font-weight: 500;
  letter-spacing: 0.22em;
  color: rgba(255, 255, 255, 0.88);
}

.bc-keywords-second {
  gap: clamp(1rem, 3vw, 1.75rem);
}

.bc-back-layout {
  position: relative;
  z-index: 1;
  height: 100%;
  display: grid;
  grid-template-columns: 1.35fr 0.85fr;
  align-items: center;
  gap: clamp(0.75rem, 2vw, 1.25rem);
  padding: clamp(1rem, 3vw, 1.6rem) clamp(1rem, 3vw, 1.5rem);
}

.bc-back-copy {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.bc-back-kicker {
  margin: 0 0 0.35rem;
  font-size: clamp(0.78rem, 2.2vw, 1.05rem);
  font-weight: 700;
  letter-spacing: 0.2em;
}

.bc-back-hint {
  margin: 0;
  font-size: clamp(0.58rem, 1.6vw, 0.72rem);
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.82);
}

.bc-back-url {
  margin: 0.15rem 0 0.55rem;
  font-size: clamp(0.72rem, 2vw, 0.98rem);
  font-weight: 700;
  letter-spacing: 0.12em;
}

.bc-access-block {
  margin-top: 0.15rem;
}

.bc-access-label {
  margin: 0;
  font-size: clamp(0.55rem, 1.5vw, 0.68rem);
  letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.72);
}

.bc-access-code {
  margin: 0.2rem 0 0;
  font-size: clamp(0.95rem, 2.8vw, 1.35rem);
  font-weight: 700;
  letter-spacing: 0.18em;
}

.bc-redeem-by {
  margin: 0.65rem 0 0;
  font-size: clamp(0.55rem, 1.5vw, 0.68rem);
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.78);
}

.bc-qr-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
}

.bc-qr {
  width: min(100%, 148px);
  aspect-ratio: 1;
  border-radius: 10px;
  background: #fff;
  padding: 8px;
  box-sizing: border-box;
}

.bc-qr-placeholder {
  background: rgba(255, 255, 255, 0.85);
}

.bc-foil-text {
  background-image: linear-gradient(
    115deg,
    var(--bc-foil-1) 0%,
    var(--bc-foil-2) 18%,
    var(--bc-foil-3) 34%,
    var(--bc-foil-4) 52%,
    var(--bc-foil-5) 72%,
    var(--bc-foil-6) 88%,
    var(--bc-foil-1) 100%
  );
  background-size: 220% 220%;
  background-position: var(--foil-x, 50%) var(--foil-y, 50%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: bc-foil-shimmer 5.5s ease-in-out infinite alternate;
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.18));
}

@keyframes bc-foil-shimmer {
  from { filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.18)) brightness(1); }
  to { filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.18)) brightness(1.18); }
}

.bc-foil-logo {
  position: relative;
  isolation: isolate;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.28));
}

.bc-foil-sheen {
  position: absolute;
  inset: -8%;
  border-radius: 50%;
  background: radial-gradient(
    circle at var(--foil-x, 50%) var(--foil-y, 50%),
    rgba(253, 235, 131, 0.55) 0%,
    rgba(179, 133, 36, 0.18) 28%,
    transparent 58%
  );
  mix-blend-mode: soft-light;
  pointer-events: none;
  animation: bc-sheen-pulse 4.5s ease-in-out infinite alternate;
}

@keyframes bc-sheen-pulse {
  from { opacity: 0.55; transform: scale(0.96); }
  to { opacity: 0.95; transform: scale(1.04); }
}

.bc-enter-logo {
  animation: bc-enter 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.bc-enter-copy {
  animation: bc-enter 1100ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both;
}

@keyframes bc-enter {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.bc-hint {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

@media (max-width: 520px) {
  .bc-card-scene {
    width: min(94vw, 420px);
    aspect-ratio: 1.55 / 1;
  }

  .bc-back-layout {
    grid-template-columns: 1fr auto;
    gap: 0.65rem;
  }

  .bc-qr {
    width: 96px;
    padding: 6px;
    border-radius: 8px;
  }

  .bc-face-inner {
    gap: 0.55rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bc-card,
  .bc-gradient-drift,
  .bc-foil-text,
  .bc-foil-sheen,
  .bc-enter-logo,
  .bc-enter-copy {
    animation: none !important;
    transition: none !important;
  }
}
`;
