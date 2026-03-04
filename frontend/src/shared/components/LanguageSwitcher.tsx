import { useState, useRef, useEffect } from 'react';
import { useI18n, type Locale } from '@core/i18n/I18nContext';
import './LanguageSwitcher.css';

const LANGUAGES: { locale: Locale; flag: string; label: string }[] = [
    { locale: 'es', flag: '🇪🇸', label: 'Español' },
    { locale: 'en', flag: '🇬🇧', label: 'English' },
];

export function LanguageSwitcher() {
    const { locale, setLocale } = useI18n();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const current = LANGUAGES.find((l) => l.locale === locale) ?? LANGUAGES[0];

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="lang-switcher" ref={ref}>
            <button
                className="lang-btn"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                title={current.label}
            >
                <span className="lang-flag">{current.flag}</span>
                <span className="lang-code">{current.locale.toUpperCase()}</span>
                <span className="lang-arrow">{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <ul className="lang-dropdown" role="listbox" aria-label="Select language">
                    {LANGUAGES.map(({ locale: loc, flag, label }) => (
                        <li
                            key={loc}
                            role="option"
                            aria-selected={loc === locale}
                            className={`lang-option${loc === locale ? ' active' : ''}`}
                            onClick={() => { setLocale(loc); setOpen(false); }}
                        >
                            <span className="lang-flag">{flag}</span>
                            <span>{label}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
