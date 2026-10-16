import type { ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { AssetClass } from '../domain/types';

export const RISK_COLORS = [
  '#22c55e',
  '#84cc16',
  '#eab308',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#dc2626',
];
export const LIQUIDITY_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
export const TAX_COLORS = {
  savings: '#38bdf8',
  general: '#a78bfa',
  mixed: '#f59e0b',
  exempt: '#22c55e',
};

/** `filled` of `total` dots, as a visual scale. */
export function Dots({ filled, total, color }: { filled: number; total: number; color: string }) {
  return (
    <span className="inv-dots" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} style={i < filled ? { background: color } : undefined} />
      ))}
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="inv-card-section">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

/** One asset class, collapsed to its headline until the reader opens it. */
export function AssetCard({
  asset,
  open,
  onToggle,
}: {
  asset: AssetClass;
  open: boolean;
  onToggle: () => void;
}) {
  const { t, locale } = useI18n();
  const bodyId = `asset-${asset.id}`;
  return (
    <li className="inv-asset" style={{ ['--cat' as string]: asset.color }}>
      <button
        type="button"
        className="inv-asset-head"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <span className="inv-asset-emoji" aria-hidden="true">
          {asset.emoji}
        </span>
        <span className="inv-asset-title">
          <small>{asset.num}</small>
          <strong>{locale === 'en' ? asset.nameEn : asset.name}</strong>
          <span>{asset.tagline}</span>
        </span>
        <span className="inv-asset-chev" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      <div className="inv-chips">
        <span className="inv-chip" title={t('app.invest.map.risk')}>
          {t('app.invest.map.risk')} {asset.risk}/7
          <Dots filled={asset.risk} total={7} color={RISK_COLORS[asset.risk - 1]} />
        </span>
        <span className="inv-chip" title={t('app.invest.map.liquidity')}>
          {t('app.invest.map.liquidity')} {asset.liquidity}/5
          <Dots filled={asset.liquidity} total={5} color={LIQUIDITY_COLORS[asset.liquidity - 1]} />
        </span>
      </div>
      {open && (
        <div id={bodyId} className="inv-asset-body">
          <Section title={t('app.invest.map.what')}>
            <p>{asset.what}</p>
          </Section>
          <Section title={t('app.invest.map.earns')}>
            <p>{asset.earns}</p>
          </Section>
          <dl className="inv-facts">
            <div>
              <dt>{t('app.invest.map.risk')}</dt>
              <dd>
                {asset.risk}/7{' '}
                <Dots filled={asset.risk} total={7} color={RISK_COLORS[asset.risk - 1]} />
              </dd>
            </div>
            <div>
              <dt>{t('app.invest.map.liquidity')}</dt>
              <dd>
                {asset.liquidity}/5{' '}
                <Dots
                  filled={asset.liquidity}
                  total={5}
                  color={LIQUIDITY_COLORS[asset.liquidity - 1]}
                />
                <small>{asset.liquidityNote}</small>
              </dd>
            </div>
            <div>
              <dt>{t('app.invest.map.horizon')}</dt>
              <dd>{asset.horizon}</dd>
            </div>
          </dl>
          <Section title={t('app.invest.map.subtypes')}>
            <ul className="inv-tags">
              {asset.subtypes.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Section>
          <div className="inv-proscons">
            <Section title={`✅ ${t('app.invest.map.pros')}`}>
              <ul>
                {asset.pros.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Section>
            <Section title={`⚠️ ${t('app.invest.map.cons')}`}>
              <ul>
                {asset.cons.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Section>
          </div>
          <div className="inv-callout inv-callout--ex">
            <strong>{t('app.invest.map.example')}</strong>
            <p>{asset.example}</p>
          </div>
          {asset.lesson && (
            <div className="inv-callout inv-callout--tip">
              <strong>{asset.lesson.title}</strong>
              <p>{asset.lesson.text}</p>
            </div>
          )}
          <Section title={`🇪🇸 ${t('app.invest.map.tax')}`}>
            <ul className="inv-tax-list">
              {asset.tax.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className="inv-note">{t('app.invest.map.taxNote')}</p>
          </Section>
        </div>
      )}
    </li>
  );
}
