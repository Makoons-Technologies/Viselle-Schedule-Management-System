import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { PageSeo } from '@/components/seo/PageSeo';
import { ViselleLogo } from '@/components/common/ViselleLogo';
import { marketingSeo } from '@/content/marketing-seo';
import {
  FOIL_FRONT_MASK_SRC,
  FOIL_FRONT_SRC,
  GET_STARTED_DISPLAY,
  businessCardUrl,
  formatRedeemBy,
  getStartedUrl,
} from '@/lib/businessCardAssets';
import { fetchBusinessCardCampaign } from '@/lib/signup';
import { cn } from '@/lib/utils';
import type { TrialCampaign } from '@/types/api';

type SocialMode = 'story' | 'square';

function SocialFoilDecor({ tiltX = 52, tiltY = 38 }: { tiltX?: number; tiltY?: number }) {
  return (
    <div
      className="soc-foil"
      style={
        {
          '--foil-x': `${tiltX}%`,
          '--foil-y': `${tiltY}%`,
          '--bc-foil-mask': `url('${FOIL_FRONT_MASK_SRC}')`,
        } as CSSProperties
      }
      aria-hidden
    >
      <img src={FOIL_FRONT_SRC} alt="" className="soc-foil-img" decoding="async" draggable={false} />
      <div className="soc-foil-sheen" />
    </div>
  );
}

export function SocialSharePage() {
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('code') ?? searchParams.get('campaign');
  const [campaign, setCampaign] = useState<TrialCampaign | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<SocialMode>('story');

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
        <div className={cn('soc-frame', mode === 'square' ? 'is-square' : 'is-story')}>
          <div className="soc-art">
            <div className="soc-gradient" aria-hidden />
            <SocialFoilDecor />
            <div className="soc-content">
              <p className="soc-script">Enjoy Three Months Free</p>
              <p className="soc-wordmark">Viselle</p>
              <h1 className="soc-headline">SCHEDULING, SIMPLIFIED</h1>
              <p className="soc-keywords">
                <span>APPOINTMENTS</span>
                <span>CLIENTS</span>
                <span>INVENTORY</span>
                <span>GROWTH</span>
                <span>SALES</span>
              </p>
              <p className="soc-kicker">EXCLUSIVE BETA ACCESS</p>
              <p className="soc-hint">Scan or visit</p>
              <p className="soc-url">{GET_STARTED_DISPLAY}</p>
              <div className="soc-access">
                <p className="soc-access-label">ACCESS CODE</p>
                <p className="soc-access-code">{loading ? '…' : (code ?? '————')}</p>
              </div>
              {redeemBy && <p className="soc-redeem">REDEEM BY {redeemBy}</p>}
              <div className="soc-qr-frame">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR code to get started with Viselle" className="soc-qr" />
                ) : (
                  <div className="soc-qr soc-qr-placeholder" aria-hidden />
                )}
              </div>
            </div>
          </div>
        </div>
        <p className="soc-hint-bar">Screenshot to share · {mode === 'square' ? 'Feed' : 'Story'} mode</p>
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
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.4rem 0.7rem;
  cursor: pointer;
}

.soc-mode-btn.is-active {
  background: rgba(253, 218, 116, 0.18);
  color: #fdeb83;
}

.soc-chrome-link {
  color: rgba(253, 235, 131, 0.88);
  text-decoration: none;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.3rem 0.35rem;
}

.soc-chrome-cta {
  color: rgba(255, 255, 255, 0.92);
  text-decoration: none;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
}

.soc-stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.75rem 0.65rem;
  gap: 0.45rem;
  overflow: hidden;
}

.soc-frame {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.soc-frame.is-story .soc-art {
  width: min(100%, calc((100dvh - 7.5rem) * 9 / 16), 420px);
  aspect-ratio: 9 / 16;
  max-height: calc(100dvh - 7.5rem);
}

.soc-frame.is-square .soc-art {
  width: min(100%, calc(100dvh - 7.5rem), 520px);
  aspect-ratio: 1 / 1;
  max-height: calc(100dvh - 7.5rem);
}

.soc-art {
  position: relative;
  border-radius: clamp(14px, 2.5vw, 22px);
  overflow: hidden;
  box-shadow:
    0 24px 50px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.06);
  background: linear-gradient(155deg, var(--bc-magenta) 0%, var(--bc-magenta-deep) 26%, var(--bc-indigo) 68%, var(--bc-navy) 100%);
}

.soc-gradient {
  position: absolute;
  inset: -15%;
  background:
    radial-gradient(circle at 22% 28%, rgba(253, 218, 116, 0.14), transparent 42%),
    radial-gradient(circle at 78% 72%, rgba(192, 38, 122, 0.32), transparent 46%);
  pointer-events: none;
}

.soc-foil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.92;
}

.soc-foil-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  user-select: none;
}

.soc-foil-sheen {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at var(--foil-x, 50%) var(--foil-y, 40%),
    rgba(253, 235, 131, 0.8) 0%,
    rgba(253, 218, 116, 0.4) 18%,
    rgba(179, 133, 36, 0.2) 34%,
    transparent 52%
  );
  mix-blend-mode: soft-light;
  -webkit-mask-image: var(--bc-foil-mask);
  mask-image: var(--bc-foil-mask);
  -webkit-mask-size: cover;
  mask-size: cover;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center top;
  mask-position: center top;
  pointer-events: none;
}

.soc-content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  text-align: center;
  padding: clamp(0.85rem, 3.5vw, 1.5rem) clamp(0.75rem, 3vw, 1.25rem);
  box-sizing: border-box;
}

.soc-script {
  margin: 0;
  font-family: "Great Vibes", "Segoe Script", cursive;
  font-size: clamp(1.15rem, 4.2vw, 1.85rem);
  line-height: 1.15;
  background: linear-gradient(115deg, var(--bc-foil-1), var(--bc-foil-2) 22%, var(--bc-foil-3) 45%, var(--bc-foil-4) 68%, var(--bc-foil-5));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.soc-wordmark {
  margin: 0.15rem 0 0;
  font-family: "Cormorant Garamond", "Times New Roman", serif;
  font-style: italic;
  font-weight: 600;
  font-size: clamp(1.55rem, 5.5vw, 2.4rem);
  letter-spacing: 0.04em;
  line-height: 1;
  background: linear-gradient(115deg, var(--bc-foil-1), var(--bc-foil-2) 22%, var(--bc-foil-3) 45%, var(--bc-foil-4) 68%, var(--bc-foil-5));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.soc-headline {
  margin: 0.35rem 0 0;
  font-size: clamp(0.72rem, 2.6vw, 1.05rem);
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.96);
}

.soc-keywords {
  margin: 0.25rem 0 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem 0.65rem;
  font-size: clamp(0.48rem, 1.6vw, 0.68rem);
  font-weight: 500;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.86);
  max-width: 100%;
}

.soc-kicker {
  margin: 0.55rem 0 0;
  font-size: clamp(0.62rem, 2.1vw, 0.88rem);
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.96);
}

.soc-hint {
  margin: 0.2rem 0 0;
  font-size: clamp(0.5rem, 1.5vw, 0.68rem);
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.8);
}

.soc-url {
  margin: 0.15rem 0 0;
  font-size: clamp(0.58rem, 2vw, 0.85rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.96);
}

.soc-access {
  margin-top: 0.35rem;
}

.soc-access-label {
  margin: 0;
  font-size: clamp(0.48rem, 1.4vw, 0.62rem);
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.7);
}

.soc-access-code {
  margin: 0.15rem 0 0;
  font-size: clamp(0.85rem, 3vw, 1.25rem);
  font-weight: 700;
  letter-spacing: 0.16em;
}

.soc-redeem {
  margin: 0.3rem 0 0;
  font-size: clamp(0.48rem, 1.4vw, 0.62rem);
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.78);
}

.soc-qr-frame {
  margin-top: 0.45rem;
  border: 2px solid var(--bc-foil-3);
  border-radius: 14px;
  padding: 5px;
  background: rgba(15, 23, 42, 0.2);
  box-shadow:
    0 0 0 1px rgba(253, 218, 116, 0.28),
    inset 0 0 0 1px rgba(253, 235, 131, 0.16);
}

.soc-qr {
  width: clamp(88px, 22vw, 132px);
  aspect-ratio: 1;
  border-radius: 10px;
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

.soc-frame.is-square .soc-content {
  justify-content: center;
  gap: 0.2rem;
  padding: clamp(0.7rem, 2.5vw, 1.15rem);
}

.soc-frame.is-square .soc-script {
  font-size: clamp(1.05rem, 3.4vw, 1.55rem);
}

.soc-frame.is-square .soc-wordmark {
  font-size: clamp(1.35rem, 4.2vw, 2rem);
}

.soc-frame.is-square .soc-keywords {
  max-width: 92%;
}

.soc-frame.is-square .soc-qr {
  width: clamp(78px, 16vw, 110px);
}

@media (max-width: 520px) {
  .soc-chrome {
    padding: 0.55rem 0.7rem;
  }

  .soc-chrome-brand span {
    display: none;
  }

  .soc-chrome-cta {
    display: none;
  }
}
`;
