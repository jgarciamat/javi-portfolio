import { useRef, useState } from 'react';
import { useI18n, type Locale } from '@core/i18n/I18nContext';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { useClickOutside } from '@shared/hooks/useClickOutside';
import { useEscapeKey } from '@shared/hooks/useEscapeKey';
import './css/LanguageSwitcher.css';

const LANGUAGES: { locale: Locale; flag: string; label: string }[] = [
  { locale: 'es', flag: '🇪🇸', label: 'Español' },
  { locale: 'en', flag: '🇬🇧', label: 'English' },
];
const BY_LOCALE = Object.fromEntries(LANGUAGES.map((l) => [l.locale, l])) as Record<
  Locale,
  (typeof LANGUAGES)[number]
>;

/** Language picker. Signed in, the choice is also saved in the account. */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const settings = useOptionalSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useClickOutside(ref, close, open);
  useEscapeKey(close, open);

  const current = BY_LOCALE[locale];
  const choose = (next: Locale) => {
    if (settings) settings.changeLocale(next);
    else setLocale(next);
    close();
  };

  return (
    <div className="lang-switcher" ref={ref}>
      <button
        className="lang-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('app.language.label')}: ${current.label}`}
      >
        <span className="lang-flag" aria-hidden="true">
          {current.flag}
        </span>
        <span className="lang-code">{current.locale.toUpperCase()}</span>
        <span className="lang-arrow" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <ul className="lang-dropdown" role="listbox" aria-label={t('app.language.label')}>
          {LANGUAGES.map(({ locale: loc, flag, label }) => (
            <li key={loc} role="option" aria-selected={loc === locale}>
              <button
                type="button"
                className={`lang-option${loc === locale ? ' active' : ''}`}
                onClick={() => choose(loc)}
              >
                <span className="lang-flag" aria-hidden="true">
                  {flag}
                </span>
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
