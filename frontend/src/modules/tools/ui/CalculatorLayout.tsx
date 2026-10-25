import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SiteLink } from '@shared/components/SiteLink';
import { useGoBack } from '@shared/hooks/useGoBack';
import { useI18n } from '@core/i18n/I18nContext';
import { PublicHeader } from '@shared/components/PublicHeader';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { parseDecimal } from '@shared/utils/numbers';
import { TOOL_PAGES, faqOf, guidesOfTool, toolPage, type ToolPage } from '../domain/toolPages';
import { VIDEOS_PATH } from '@modules/guides/domain/videos';
import { HACIENDA_PATH } from '@modules/guides/domain/hacienda';
import { SignupWall, TeaserOutline, useGate } from '@modules/guides/ui/SignupWall';
import './css/Tools.css';
import '@modules/guides/ui/css/Guides.css';

/** Euros in the language of the visitor; with `cents`, two decimals. */
export function useMoney(cents = false) {
  const { locale } = useI18n();
  const formatter = new Intl.NumberFormat(locale === 'en' ? 'en-IE' : 'es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
    useGrouping: 'always' as unknown as boolean, // also 1.000 (es-ES skips the dot under 10.000)
  });
  return (n: number) => formatter.format(n);
}

/** The questions of a calculator, as the page shows them and as search engines read them. */
function Faq({
  keyOf,
  numbers,
}: {
  keyOf: (n: number, part: 'q' | 'a') => string;
  numbers: number[];
}) {
  const { t } = useI18n();
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: numbers.map((n) => ({
      '@type': 'Question',
      name: t(keyOf(n, 'q')),
      acceptedAnswer: { '@type': 'Answer', text: t(keyOf(n, 'a')) },
    })),
  });
  return (
    <section className="tools-faq">
      <h2>{t('tools.faq.title')}</h2>
      {numbers.map((n) => (
        <details key={n}>
          <summary>{t(keyOf(n, 'q'))}</summary>
          <p>{t(keyOf(n, 'a'))}</p>
        </details>
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd.replace(/</g, '\\u003c') }}
      />
    </section>
  );
}

export function CalculatorLayout({
  path,
  titleKey,
  descriptionKey,
  lead,
  children,
}: {
  path: string;
  titleKey: string;
  descriptionKey: string;
  /** Shown to everyone, above the tool or the sign-up wall (the tool itself is for accounts). */
  lead?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const gate = useGate();
  const goBack = useGoBack();
  usePageMeta(t(titleKey), t(descriptionKey), path);
  const page = toolPage(path);
  const faq = faqOf(page);
  const faqKey = (n: number, part: 'q' | 'a') => `tools.${(page as ToolPage).key}.faq${n}.${part}`;
  return (
    <div className="pricing-page">
      <PublicHeader />
      <main className="pricing-main tools-main">
        <p className="tools-back">
          <button type="button" className="back-btn" onClick={goBack}>
            ← {t('tools.back')}
          </button>
        </p>
        <h1 className="pricing-title">{t(titleKey)}</h1>
        <p className="pricing-subtitle">{t(descriptionKey)}</p>
        {lead}
        {gate === 'open' ? (
          <>
            {children}
            {faq.length > 0 && <Faq keyOf={faqKey} numbers={faq} />}
          </>
        ) : (
          <>
            <TeaserOutline
              title={t('wall.outline.tool')}
              items={faq.map((n) => t(faqKey(n, 'q')))}
            />
            <SignupWall kicker={t('wall.kicker.tool')} />
          </>
        )}
        <section className="guide-related">
          <h2>{t('landing.learn.guides')}</h2>
          <ul>
            {guidesOfTool(path).map((g) => (
              <li key={g.slug}>
                <SiteLink to={`/guias/${g.slug}`}>{g.title}</SiteLink>
              </li>
            ))}
          </ul>
        </section>
        <p className="pricing-links">
          {TOOL_PAGES.map((tool) => (
            <span key={tool.key}>
              <Link to={tool.path}>{t(`tools.${tool.key}.nav`)}</Link> ·{' '}
            </span>
          ))}
          <SiteLink to="/guias">{t('tools.guides.nav')}</SiteLink> ·{' '}
          <Link to={HACIENDA_PATH}>{t('hacienda.title')}</Link> ·{' '}
          <Link to={VIDEOS_PATH}>{t('videos.title')}</Link> ·{' '}
          <Link to="/pricing">{t('pricing.link')}</Link>
        </p>
      </main>
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <div className="tools-field">
      <label htmlFor={id}>{label}</label>
      <span className="tools-input">
        <input
          id={id}
          className="tx-input"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <small>{suffix}</small>}
      </span>
    </div>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="tools-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="tx-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export const number = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) ? parsed : 0;
};
