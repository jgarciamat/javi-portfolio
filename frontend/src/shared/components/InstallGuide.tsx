import { useState, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { currentBrowser, iosBrowser, type InstallBrowser } from '@core/install/iosInstall';
import { PLAY_URL } from '@modules/landing/domain/landing';
import { Icon } from '@shared/components/Icon';
import { Modal } from '@shared/components/Modal';
import { isNativeApp } from '@shared/utils/platform';
import './css/InstallGuide.css';

/** Chrome first: more people use it. */
const BROWSERS: InstallBrowser[] = ['chrome', 'safari'];
const STEPS = [1, 2, 3] as const;
type Step = (typeof STEPS)[number];

/** The browser the guide opens on: the one in use on an iPhone or iPad, otherwise Chrome. */
const initialBrowser = (): InstallBrowser => iosBrowser(currentBrowser()) ?? 'chrome';

/** The Share glyph of iOS: a square open at the top with an arrow going up out of it. */
function ShareGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="install-art-glyph">
      <path d="M-9 -4h-5v20h28v-20h-5" />
      <path d="M0 6v-22M-7 -9l7-7 7 7" />
    </g>
  );
}

/** A browser screen with its address bar: the drawing every step starts from. */
function Screen({ children, address }: { children?: ReactNode; address: string }) {
  return (
    <>
      <rect className="install-art-screen" x="4" y="4" width="252" height="172" rx="16" />
      <rect className="install-art-bar" x="18" y="16" width="224" height="34" rx="10" />
      <text className="install-art-text" x="36" y="39">
        {address}
      </text>
      {children}
    </>
  );
}

/** Step 1: the address typed in the bar. */
function OpenArt({ address }: { address: string }) {
  return (
    <Screen address={address}>
      <rect className="install-art-ring" x="14" y="12" width="232" height="42" rx="13" />
      <rect className="install-art-line" x="30" y="78" width="200" height="12" rx="6" />
      <rect className="install-art-line" x="30" y="102" width="160" height="12" rx="6" />
      <rect className="install-art-line" x="30" y="126" width="180" height="12" rx="6" />
    </Screen>
  );
}

/** Step 2 in Chrome: Share sits to the right of the address bar (Google's help). */
function ChromeShareArt({ address, share }: { address: string; share: string }) {
  return (
    <Screen address={address}>
      <ShareGlyph x={220} y={34} />
      <circle className="install-art-ring" cx="220" cy="33" r="22" />
      <text className="install-art-label" x="196" y="96" textAnchor="middle">
        {share}
      </text>
      <path className="install-art-arrow" d="M214 78l4-18" />
    </Screen>
  );
}

/** Step 2 in Safari: Share, or "More" first when Share is not in sight (Apple's guide). */
function SafariShareArt({ share, more }: { share: string; more: string }) {
  return (
    <>
      <rect className="install-art-screen" x="4" y="4" width="252" height="172" rx="16" />
      <ShareGlyph x={78} y={80} />
      <circle className="install-art-ring" cx="78" cy="78" r="30" />
      <text className="install-art-label" x="78" y="142" textAnchor="middle">
        {share}
      </text>
      <g className="install-art-dots">
        <circle cx="168" cy="80" r="4" />
        <circle cx="182" cy="80" r="4" />
        <circle cx="196" cy="80" r="4" />
      </g>
      <circle className="install-art-soft-ring" cx="182" cy="78" r="30" />
      <text className="install-art-label" x="182" y="142" textAnchor="middle">
        {more}
      </text>
    </>
  );
}

/** Step 3: the "Add to Home Screen" row of the Share list, then "Add". */
function AddArt({ addHome, add }: { addHome: string; add: string }) {
  return (
    <>
      <rect className="install-art-screen" x="4" y="4" width="252" height="172" rx="16" />
      <rect className="install-art-line" x="18" y="18" width="224" height="26" rx="8" />
      <rect className="install-art-row" x="18" y="56" width="224" height="40" rx="10" />
      <g className="install-art-glyph">
        <rect x="30" y="64" width="24" height="24" rx="6" />
        <path d="M42 70v12M36 76h12" />
      </g>
      <text className="install-art-text install-art-text--row" x="62" y="81">
        {addHome}
      </text>
      <rect className="install-art-ring" x="14" y="52" width="232" height="48" rx="13" />
      <rect className="install-art-button" x="150" y="122" width="92" height="38" rx="19" />
      <text className="install-art-button-text" x="196" y="147" textAnchor="middle">
        {add}
      </text>
    </>
  );
}

function StepArt({ browser, step }: { browser: InstallBrowser; step: Step }) {
  const { t } = useI18n();
  const address = t('install.art.address');
  const share = t('install.art.share');
  let art = <AddArt addHome={t('install.art.addHome')} add={t('install.art.add')} />;
  if (step === 1) art = <OpenArt address={address} />;
  else if (step === 2 && browser === 'chrome')
    art = <ChromeShareArt address={address} share={share} />;
  else if (step === 2) art = <SafariShareArt share={share} more={t('install.art.more')} />;
  return (
    <svg className="install-art" viewBox="0 0 260 180" aria-hidden="true" focusable="false">
      {art}
    </svg>
  );
}

/** The three steps to put Finanverso on the home screen of an iPhone or iPad, in Chrome or Safari. */
export function InstallGuide() {
  const { t } = useI18n();
  const [browser, setBrowser] = useState<InstallBrowser>(initialBrowser);
  return (
    <div className="install-guide">
      <p className="install-lead">{t('install.intro')}</p>
      <div className="install-browsers" role="group" aria-label={t('install.browserLabel')}>
        {BROWSERS.map((b) => (
          <button
            key={b}
            type="button"
            className="install-browser"
            aria-pressed={browser === b}
            onClick={() => setBrowser(b)}
          >
            {t(`install.browser.${b}`)}
          </button>
        ))}
      </div>
      <ol className="install-steps">
        {STEPS.map((step) => (
          <li key={step} className="install-step">
            <StepArt browser={browser} step={step} />
            <div>
              <p className="install-step-number">{t('install.stepN', { n: step })}</p>
              <h3 className="install-step-title">{t(`install.${browser}.step${step}.title`)}</h3>
              <p className="install-step-body">{t(`install.${browser}.step${step}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="install-note install-note--done">{t('install.done')}</p>
      <p className="install-note">{t('install.browsers')}</p>
      <p className="install-note">{t('install.notices')}</p>
      <p>
        <a
          className="btn-secondary install-play"
          href={PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="download" /> {t('install.play')}
        </a>
      </p>
    </div>
  );
}

/** The guide in a dialog: opened from the notice and from the cards. */
export function InstallGuideDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal
      label={t('install.title')}
      onClose={onClose}
      overlayClassName="install-overlay"
      className="install-dialog"
    >
      <div className="install-dialog-head">
        <h2 className="install-title">
          <Icon name="home" /> {t('install.title')}
        </h2>
        <button
          type="button"
          className="install-close"
          aria-label={t('install.close')}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <InstallGuide />
      <div className="install-dialog-foot">
        <button type="button" className="btn-primary install-big-btn" onClick={onClose}>
          {t('app.common.close')}
        </button>
      </div>
    </Modal>
  );
}

/** "Have Finanverso as an app": in Settings and in Learn, on any device except inside the mobile apps. */
export function InstallGuideCard() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (isNativeApp()) return null;
  return (
    <div className="card install-card">
      <h2 className="section-title">
        <Icon name="home" /> {t('install.title')}
      </h2>
      <p className="install-lead">{t('install.intro')}</p>
      <button type="button" className="btn-primary install-big-btn" onClick={() => setOpen(true)}>
        {t('install.open')}
      </button>
      {open && <InstallGuideDialog onClose={() => setOpen(false)} />}
    </div>
  );
}
