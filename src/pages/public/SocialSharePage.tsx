import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { PageSeo } from '@/components/seo/PageSeo';
import { ViselleLogo } from '@/components/common/ViselleLogo';
import { marketingSeo } from '@/content/marketing-seo';
import {
  GET_STARTED_DISPLAY,
  businessCardUrl,
  formatRedeemBy,
  getStartedUrl,
} from '@/lib/businessCardAssets';
import { fetchBusinessCardCampaign } from '@/lib/signup';
import { cn } from '@/lib/utils';
import type { TrialCampaign } from '@/types/api';

type SocialMode = 'story' | 'square';

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
            <div className="soc-content">
              <div className="soc-brand">
                <ViselleLogo size={mode === 'square' ? 112 : 140} className="soc-crest" />
                <p className="soc-name">Viselle</p>
              </div>

              <div className="soc-copy">
                <p className="soc-offer">Enjoy three months free</p>
                <h1 className="soc-headline">SCHEDULING, SIMPLIFIED</h1>
                <p className="soc-keywords">
                  <span>Appointments</span>
                  <span>Clients</span>
                  <span>Inventory</span>
                  <span>Growth</span>
                  <span>Sales</span>
                </p>
              </div>

              <div className="soc-cta">
                <p className="soc-kicker">Exclusive beta access</p>
                <p className="soc-hint">Scan or visit</p>
                <p className="soc-url">{GET_STARTED_DISPLAY}</p>
                <div className="soc-access">
                  <p className="soc-access-label">Access code</p>
                  <p className="soc-access-code">{loading ? '…' : (code ?? '————')}</p>
                </div>
                {redeemBy && <p className="soc-redeem">Redeem by {redeemBy}</p>}
              </div>

              <div className="soc-qr-wrap">
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

.soc-frame {
  width: min(100%, 420px);
  max-height: 100%;
}

.soc-frame.is-story {
  aspect-ratio: 9 / 16;
}

.soc-frame.is-square {
  aspect-ratio: 1 / 1;
  width: min(100%, min(420px, 78dvh));
}

.soc-art {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: clamp(16px, 3vw, 22px);
  overflow: hidden;
  box-shadow:
    0 28px 56px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.06);
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
  padding: clamp(1.1rem, 4vw, 1.75rem) clamp(1rem, 4vw, 1.5rem);
  box-sizing: border-box;
  gap: 0.65rem;
}

.soc-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.soc-crest {
  display: block;
  filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.28));
}

.soc-name {
  margin: 0;
  font-family: "Cormorant Garamond", "Times New Roman", Georgia, serif;
  font-style: italic;
  font-weight: 600;
  font-size: clamp(1.35rem, 4.5vw, 1.85rem);
  letter-spacing: 0.06em;
  background: linear-gradient(115deg, var(--bc-foil-1), var(--bc-foil-2) 40%, var(--bc-foil-3));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.soc-copy,
.soc-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  max-width: 100%;
}

.soc-offer {
  margin: 0;
  font-size: clamp(0.72rem, 2.4vw, 0.92rem);
  font-weight: 500;
  letter-spacing: 0.04em;
  color: rgba(253, 235, 131, 0.92);
}

.soc-headline {
  margin: 0;
  font-size: clamp(0.78rem, 2.8vw, 1.05rem);
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.96);
}

.soc-keywords {
  margin: 0.15rem 0 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.3rem 0.7rem;
  font-size: clamp(0.55rem, 1.8vw, 0.7rem);
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.78);
}

.soc-kicker {
  margin: 0;
  font-size: clamp(0.68rem, 2.2vw, 0.88rem);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.96);
}

.soc-hint {
  margin: 0;
  font-size: clamp(0.55rem, 1.7vw, 0.7rem);
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.75);
}

.soc-url {
  margin: 0;
  font-size: clamp(0.65rem, 2.1vw, 0.88rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.96);
}

.soc-access-label {
  margin: 0.35rem 0 0;
  font-size: clamp(0.5rem, 1.5vw, 0.62rem);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
}

.soc-access-code {
  margin: 0.15rem 0 0;
  font-size: clamp(1rem, 3.4vw, 1.35rem);
  font-weight: 700;
  letter-spacing: 0.14em;
}

.soc-redeem {
  margin: 0.25rem 0 0;
  font-size: clamp(0.5rem, 1.5vw, 0.62rem);
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.7);
}

.soc-qr-wrap {
  flex-shrink: 0;
  margin-top: auto;
  padding-top: 0.35rem;
}

.soc-qr {
  width: clamp(96px, 24vw, 128px);
  aspect-ratio: 1;
  border-radius: 12px;
  background: #fff;
  padding: 8px;
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
  gap: 0.45rem;
  padding: clamp(0.9rem, 3vw, 1.25rem);
}

.soc-frame.is-square .soc-keywords {
  max-width: 92%;
}

.soc-frame.is-square .soc-qr {
  width: clamp(84px, 20vw, 108px);
}

@media (max-height: 720px) {
  .soc-crest {
    width: 100px !important;
    height: 100px !important;
  }

  .soc-name {
    font-size: 1.25rem;
  }

  .soc-qr {
    width: 88px;
  }
}
`;
