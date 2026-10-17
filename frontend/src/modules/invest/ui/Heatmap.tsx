import { ScrollRegion } from '@shared/components/ScrollRegion';
import { useI18n } from '@core/i18n/I18nContext';
import { ASSET_CLASSES } from '../domain/content';
import { IRPF_GLANCE, IVA_GLANCE, SAVINGS_SCALE_SOURCE, type GlanceRow } from '../domain/taxGlance';
import { SAVINGS_SCALE } from '../domain/taxes';
import { useNumbers } from './calculators/Fields';
import { LIQUIDITY_COLORS, RISK_COLORS, TAX_COLORS } from './AssetCard';

const tint = (color: string) => ({ ['--c' as string]: color });

/** Risk x liquidity x tax treatment of every asset class, as a coloured grid. */
export function Heatmap() {
  const { t, locale } = useI18n();
  return (
    <section className="inv-block" aria-label={t('app.invest.heat.title')}>
      <h3>{t('app.invest.heat.title')}</h3>
      <p className="inv-hint-text">{t('app.invest.heat.hint')}</p>
      <ScrollRegion className="inv-table-wrap" label={t('app.invest.heat.title')}>
        <table className="inv-table inv-heat">
          <caption className="sr-only">{t('app.invest.heat.title')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('app.invest.heat.class')}</th>
              <th scope="col">{t('app.invest.map.risk')}</th>
              <th scope="col">{t('app.invest.map.liquidity')}</th>
              <th scope="col">{t('app.invest.heat.tax')}</th>
            </tr>
          </thead>
          <tbody>
            {ASSET_CLASSES.map((a) => (
              <tr key={a.id}>
                <th scope="row">
                  <span aria-hidden="true">{a.emoji}</span> {locale === 'en' ? a.nameEn : a.name}
                </th>
                <td className="inv-heat-cell" style={tint(RISK_COLORS[a.risk - 1])}>
                  {a.risk}/7
                </td>
                <td className="inv-heat-cell" style={tint(LIQUIDITY_COLORS[a.liquidity - 1])}>
                  {a.liquidity}/5
                </td>
                <td className="inv-heat-cell inv-heat-tax" style={tint(TAX_COLORS[a.taxKind])}>
                  {a.taxShort}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
      <ul className="inv-legend inv-legend--wrap">
        {(['savings', 'general', 'mixed', 'exempt'] as const).map((k) => (
          <li key={k}>
            <i style={{ background: TAX_COLORS[k] }} aria-hidden="true" />
            {t(`app.invest.heat.kind.${k}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function GlanceTable({ title, rows }: { title: string; rows: GlanceRow[] }) {
  const { t } = useI18n();
  return (
    <ScrollRegion className="inv-table-wrap" label={title}>
      <table className="inv-table inv-glance">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{t('app.invest.glance.concept')}</th>
            <th scope="col">{t('app.invest.glance.rule')}</th>
            <th scope="col">{t('app.invest.glance.where')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.concept}>
              <th scope="row">{r.concept}</th>
              <td>{r.rule}</td>
              <td>{r.where}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollRegion>
  );
}

/** IRPF and IVA at a glance, with the savings scale of the app's own tax data. */
export function TaxGlance() {
  const { t } = useI18n();
  const { eur, pct } = useNumbers();
  return (
    <section className="inv-block" aria-label={t('app.invest.glance.title')}>
      <h3>{t('app.invest.glance.title')}</h3>
      <p className="inv-hint-text">{t('app.invest.glance.hint')}</p>
      <div className="inv-scale" role="list" aria-label={t('app.invest.glance.scale')}>
        {SAVINGS_SCALE.map((b, i) => (
          <div
            key={b.from}
            role="listitem"
            className="inv-scale-step"
            style={{ ['--w' as string]: i + 1 }}
          >
            <strong>{pct(b.rate, 0)}</strong>
            <span>
              {i === SAVINGS_SCALE.length - 1
                ? t('app.invest.calc.tax.over', { from: eur(b.from) })
                : t('app.invest.calc.tax.range', {
                    from: eur(b.from),
                    to: eur(SAVINGS_SCALE[i + 1].from),
                  })}
            </span>
          </div>
        ))}
      </div>
      <p className="inv-note">
        {t('app.invest.glance.scaleNote')}{' '}
        <a href={SAVINGS_SCALE_SOURCE} target="_blank" rel="noopener noreferrer">
          {t('app.invest.calc.tax.source')}
        </a>
      </p>
      <GlanceTable title={t('app.invest.glance.irpf')} rows={IRPF_GLANCE} />
      <GlanceTable title={t('app.invest.glance.iva')} rows={IVA_GLANCE} />
      <p className="inv-note">{t('app.invest.glance.verify')}</p>
    </section>
  );
}
