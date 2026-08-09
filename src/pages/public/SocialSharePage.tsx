import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { PageSeo } from '@/components/seo/PageSeo';
import { ViselleLogo } from '@/components/common/ViselleLogo';
import { marketingSeo } from '@/content/marketing-seo';
import {
  BC_CREST_MASK_SRC,
  BC_WORDMARK_MASK_SRC,
  GET_STARTED_DISPLAY,
  businessCardUrl,
  formatRedeemBy,
  getStartedUrl,
} from '@/lib/businessCardAssets';
import { fetchBusinessCardCampaign } from '@/lib/signup';
import { cn } from '@/lib/utils';
import type { TrialCampaign } from '@/types/api';

type SocialMode = 'story' | 'square';

function FoilMasked({
  maskSrc,
  className,
  label,
}: {
  maskSrc: string;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn('soc-foil', className)}
      style={{ '--bc-mask': `url('${maskSrc}')` } as CSSProperties}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

function parseSocialMode(value: string | null): SocialMode | null {
  if (value === 'story' || value === 'square') return value;
  return null;
}

export function SocialSharePage() {
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('code') ?? searchParams.get('campaign');
  const modeParam = parseSocialMode(searchParams.get('mode'));
  const [campaign, setCampaign] = useState<TrialCampaign | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<SocialMode>(() => modeParam ?? 'story');

  useEffect(() => {
    if (modeParam) setMode(modeParam);
  }, [modeParam]);

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

  const code = campaign?.code?.trim() || null;
  const redeemBy = formatRedeemBy(campaign?.expiresAt);
  const cardHref = businessCardUrl(campaign?.code ?? codeParam);
  const isSquare = mode === 'square';

  return (
    <div className="soc-page bg-marketing">
      <PageSeo {...marketingSeo.social} />
      <style>{socialCss}</style>

      <header className="soc-chrome">
        <Link to="/" className="soc-chrome-brand" aria-label="Viselle home">
          <ViselleLogo size={28} />
          <span>Viselle</span>
        </Link>
        <div className="soc-chrome-actions">
          <div className="soc-mode-toggle" role="group" aria-label="Image shape">
            <button
              type="button"
              className={cn('soc-mode-btn', mode === 'story' && 'is-active')}
              onClick={() => setMode('story')}
            >
              Story
            </button>
            <button
              type="button"
              className={cn('soc-mode-btn', mode === 'square' && 'is-active')}
              onClick={() => setMode('square')}
            >
              Square
            </button>
          </div>
          <Link to={cardHref} className="soc-chrome-link">
            Card
          </Link>
          <Link to={getStartedUrl(campaign?.code)} className="soc-chrome-cta">
            Get started
          </Link>
        </div>
      </header>

      <main className="soc-stage">
        <div className={cn('soc-frame', isSquare ? 'is-square' : 'is-story')}>
          <div className="soc-art">
            <div className="soc-gradient" aria-hidden />
            <div className="soc-content">
              <div className="soc-brand">
                <FoilMasked
                  maskSrc={BC_CREST_MASK_SRC}
                  className="soc-foil-crest"
                  label="Viselle crest"
                />
                <FoilMasked
                  maskSrc={BC_WORDMARK_MASK_SRC}
                  className="soc-foil-wordmark"
                  label="Viselle"
                />
              </div>

              <div className="soc-copy">
                <p className="soc-offer">Enjoy Three Months Free</p>
                <h1 className="soc-headline">Scheduling, Simplified</h1>
                <p className="soc-keywords">
                  <span>Appointments</span>
                  <span>Clients</span>
                  <span>Inventory</span>
                  <span>Growth</span>
                  <span>Sales</span>
                </p>
              </div>

              <div className="soc-footer">
                <div className="soc-cta">
                  <p className="soc-kicker">Exclusive Beta Access</p>
                  <p className="soc-hint">Scan the QR code or visit</p>
                  <p className="soc-url">{GET_STARTED_DISPLAY}</p>
                  <div className="soc-access">
                    <p className="soc-access-label">Access Code</p>
                    <p className="soc-access-code">{loading ? '…' : (code ?? '————')}</p>
                  </div>
                  {redeemBy && <p className="soc-redeem">Redeem by {redeemBy}</p>}
                </div>

                <div className="soc-qr-wrap">
                  <div className="soc-qr-frame">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="QR code to get started with Viselle"
                        className="soc-qr"
                        width={320}
                        height={320}
                      />
                    ) : (
                      <div className="soc-qr soc-qr-placeholder" aria-hidden />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="soc-hint-bar">Screenshot to share · {isSquare ? 'Feed' : 'Story'} mode</p>
      </main>
    </div>
  );
}

const socialCss = `
.soc-page {
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
  height: 100dvh;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  color: #fff;
  font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
  overflow: hidden;
}

.soc-chrome {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  z-index: 2;
}

.soc-chrome-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  letter-spacing: 0.04em;
  font-size: 0.9rem;
}

.soc-chrome-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.soc-mode-toggle {
  display: inline-flex;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  overflow: hidden;
}

.soc-mode-btn {
  appearance: none;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-family: inherit;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.4rem 0.7rem;
  cursor: pointer;
}

.soc-mode-btn.is-active {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.soc-chrome-link,
.soc-chrome-cta {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
}

.soc-chrome-cta {
  background: rgba(255, 255, 255, 0.1);
}

.soc-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 0 0.75rem 0.85rem;
}

/* Size from viewport so aspect-ratio always wins (max-height alone was breaking square). */
.soc-frame {
  position: relative;
  flex: 0 1 auto;
  overflow: hidden;
  border-radius: clamp(16px, 3vw, 22px);
  box-shadow:
    0 28px 56px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.06);
}

.soc-frame.is-story {
  aspect-ratio: 9 / 16;
  width: min(100%, 420px, calc((100dvh - 7.5rem) * 9 / 16));
  height: auto;
  max-height: calc(100dvh - 7.5rem);
}

.soc-frame.is-square {
  aspect-ratio: 1 / 1;
  width: min(100%, 420px, calc(100dvh - 7.5rem));
  height: auto;
  max-height: calc(100dvh - 7.5rem);
}

.soc-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
}

.soc-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    160deg,
    var(--bc-magenta) 0%,
    var(--bc-magenta-deep) 28%,
    var(--bc-indigo) 72%,
    var(--bc-navy) 100%
  );
}

.soc-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  text-align: center;
  padding: clamp(1rem, 3.5vw, 1.6rem) clamp(0.9rem, 3.5vw, 1.4rem);
  box-sizing: border-box;
  gap: clamp(0.35rem, 1.5vw, 0.65rem);
}

.soc-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  flex-shrink: 0;
  width: min(78%, 280px);
}

.soc-foil {
  display: block;
  flex-shrink: 0;
  background-image:
    radial-gradient(
      circle at 50% 42%,
      rgba(255, 248, 210, 0.95) 0%,
      rgba(253, 235, 131, 0.55) 18%,
      rgba(253, 218, 116, 0.22) 34%,
      transparent 52%
    ),
    var(--bc-foil-grad);
  background-size: 160% 160%, 280% 280%;
  background-position: 50% 42%, 0% 50%;
  background-repeat: no-repeat;
  animation: soc-foil-shift 5.5s ease-in-out infinite alternate;
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
}

@keyframes soc-foil-shift {
  from { background-position: 50% 42%, 8% 40%; }
  to { background-position: 50% 42%, 88% 60%; }
}

.soc-foil-crest {
  width: min(100%, clamp(88px, 22vw, 132px));
  aspect-ratio: 710.72 / 611.16;
}

.soc-foil-wordmark {
  width: min(92%, clamp(140px, 36vw, 210px));
  aspect-ratio: 298 / 61;
}

.soc-copy,
.soc-cta,
.soc-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  max-width: 100%;
  width: 100%;
}

.soc-footer {
  gap: clamp(0.45rem, 1.8vw, 0.75rem);
  flex-shrink: 0;
}

.soc-offer {
  margin: 0;
  font-family: Lobster, cursive;
  font-style: normal;
  font-weight: 400;
  font-size: clamp(1.35rem, 4.4vw, 1.8rem);
  line-height: 1.2;
  letter-spacing: 0.02em;
  background-image: var(--bc-foil-grad);
  background-size: 280% 280%;
  background-position: 0% 50%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: soc-foil-shift 5.5s ease-in-out infinite alternate;
}

.soc-headline {
  margin: 0;
  font-size: clamp(0.92rem, 3vw, 1.2rem);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.25;
  color: rgba(255, 255, 255, 0.98);
}

.soc-keywords {
  margin: 0.2rem 0 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem 0.65rem;
  font-size: clamp(0.68rem, 2.2vw, 0.85rem);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.9);
}

.soc-kicker {
  margin: 0;
  font-size: clamp(0.82rem, 2.6vw, 1.05rem);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.98);
}

.soc-hint {
  margin: 0.1rem 0 0;
  font-size: clamp(0.72rem, 2.2vw, 0.88rem);
  font-weight: 500;
  letter-spacing: 0.03em;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.9);
}

.soc-url {
  margin: 0;
  font-size: clamp(0.8rem, 2.5vw, 1.05rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.98);
}

.soc-access-label {
  margin: 0.4rem 0 0;
  font-size: clamp(0.68rem, 2vw, 0.8rem);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.82);
}

.soc-access-code {
  margin: 0.2rem 0 0;
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(1.15rem, 3.6vw, 1.5rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  font-variant-numeric: slashed-zero;
  font-feature-settings: "zero" 1;
  font-variant-ligatures: none;
  color: rgba(255, 255, 255, 0.98);
}

.soc-redeem {
  margin: 0.3rem 0 0;
  font-size: clamp(0.66rem, 1.9vw, 0.78rem);
  font-weight: 500;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.82);
}

.soc-qr-wrap {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 0.2rem;
}

.soc-qr-frame {
  width: clamp(108px, 26vw, 140px);
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
  border-radius: 12px;
  padding: 3px;
  box-sizing: border-box;
  background-image: var(--bc-foil-grad);
  background-size: 280% 280%;
  background-position: 0% 50%;
  animation: soc-foil-shift 5.5s ease-in-out infinite alternate;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.soc-qr {
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  object-position: center;
  border-radius: 9px;
  background: #fff;
  padding: 6px;
  box-sizing: border-box;
  display: block;
}

.soc-qr-placeholder {
  background: rgba(255, 255, 255, 0.85);
}

.soc-hint-bar {
  flex: 0 0 auto;
  margin: 0;
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

/* Square / feed: brand + offer as one hero, CTA + QR as a compact footer */
.soc-frame.is-square .soc-content {
  justify-content: center;
  gap: clamp(0.85rem, 3.2vw, 1.25rem);
  padding:
    clamp(1.2rem, 4.4vw, 1.7rem)
    clamp(1.15rem, 4.2vw, 1.65rem)
    clamp(1.3rem, 4.8vw, 1.85rem);
}

.soc-frame.is-square .soc-brand {
  width: min(68%, 210px);
  gap: 0.08rem;
}

.soc-frame.is-square .soc-foil-crest {
  width: min(100%, clamp(82px, 21vw, 112px));
}

.soc-frame.is-square .soc-foil-wordmark {
  width: min(92%, clamp(132px, 33vw, 180px));
}

.soc-frame.is-square .soc-copy {
  flex: 0 0 auto;
  gap: 0.4rem;
}

.soc-frame.is-square .soc-offer {
  font-size: clamp(1.45rem, 5vw, 1.95rem);
  letter-spacing: 0.01em;
  line-height: 1.12;
}

.soc-frame.is-square .soc-headline {
  font-size: clamp(0.74rem, 2.4vw, 0.92rem);
  letter-spacing: 0.16em;
}

.soc-frame.is-square .soc-keywords {
  display: none;
}

.soc-frame.is-square .soc-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: clamp(0.75rem, 2.8vw, 1.1rem);
  margin-top: clamp(0.1rem, 0.8vw, 0.25rem);
  text-align: left;
}

.soc-frame.is-square .soc-cta {
  align-items: flex-start;
  gap: 0.12rem;
  min-width: 0;
}

.soc-frame.is-square .soc-kicker {
  font-size: clamp(0.68rem, 2.15vw, 0.86rem);
  letter-spacing: 0.11em;
}

.soc-frame.is-square .soc-hint {
  display: none;
}

.soc-frame.is-square .soc-url {
  margin-top: 0.2rem;
  font-size: clamp(0.68rem, 2.15vw, 0.84rem);
  letter-spacing: 0.04em;
  word-break: break-word;
}

.soc-frame.is-square .soc-access-label {
  margin: 0.4rem 0 0;
  font-size: clamp(0.58rem, 1.7vw, 0.68rem);
}

.soc-frame.is-square .soc-access-code {
  margin: 0.1rem 0 0;
  font-size: clamp(1.05rem, 3.4vw, 1.35rem);
}

.soc-frame.is-square .soc-redeem {
  margin: 0.18rem 0 0;
  font-size: clamp(0.56rem, 1.6vw, 0.68rem);
}

.soc-frame.is-square .soc-qr-wrap {
  padding-top: 0;
  align-self: end;
}

.soc-frame.is-square .soc-qr-frame {
  width: clamp(102px, 25vw, 128px);
}

@media (max-height: 720px) {
  .soc-frame.is-story .soc-foil-crest {
    width: min(100%, 88px);
  }

  .soc-frame.is-story .soc-foil-wordmark {
    width: min(92%, 150px);
  }

  .soc-frame.is-story .soc-qr-frame {
    width: 100px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .soc-foil,
  .soc-offer,
  .soc-qr-frame {
    animation: none !important;
  }
}
`;
