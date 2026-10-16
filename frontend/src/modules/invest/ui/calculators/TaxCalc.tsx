import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { SAVINGS_SCALE, taxOnGain } from '../../domain/taxes';
import { SAVINGS_SCALE_SOURCE } from '../../domain/taxGlance';
import { CalcShell, Field, Stat, num, useNumbers } from './Fields';

/** Tax of a gain in the Spanish savings base, with the scale the app already uses for the Renta. */
export function TaxCalc() {
  const { t } = useI18n();
  const { eur, pct } = useNumbers();
  const [gain, setGain] = useState('10000');
  const [other, setOther] = useState('0');
  const [withheld, setWithheld] = useState('0');
  const r = taxOnGain(num(gain), num(other));
  const settle = r.tax - Math.max(0, num(withheld));

  return (
    <CalcShell title={t('app.invest.calc.tax.title')} intro={t('app.invest.calc.tax.intro')}>
      <div className="inv-form">
        <Field
          id="tx-gain"
          label={t('app.invest.calc.tax.gain')}
          value={gain}
          onChange={setGain}
          suffix="€"
          hint={t('app.invest.calc.tax.gainHint')}
        />
        <Field
          id="tx-other"
          label={t('app.invest.calc.tax.other')}
          value={other}
          onChange={setOther}
          suffix="€"
          hint={t('app.invest.calc.tax.otherHint')}
        />
        <Field
          id="tx-withheld"
          label={t('app.invest.calc.tax.withheld')}
          value={withheld}
          onChange={setWithheld}
          suffix="€"
          hint={t('app.invest.calc.tax.withheldHint')}
        />
      </div>
      <div className="inv-stats" aria-live="polite">
        <Stat label={t('app.invest.calc.tax.tax')} value={eur(r.tax)} tone="bad" />
        <Stat label={t('app.invest.calc.tax.net')} value={eur(r.net)} tone="good" />
        <Stat label={t('app.invest.calc.tax.average')} value={pct(r.averageRatePct, 2)} />
        <Stat
          label={t('app.invest.calc.tax.marginal')}
          value={r.gain > 0 ? pct(r.marginalRatePct, 0) : '–'}
        />
        <Stat
          label={settle >= 0 ? t('app.invest.calc.tax.toPay') : t('app.invest.calc.tax.toGet')}
          value={eur(Math.abs(settle))}
          tone="accent"
        />
      </div>
      <div className="inv-table-wrap">
        <table className="inv-table">
          <caption className="sr-only">{t('app.invest.calc.tax.scale')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('app.invest.calc.tax.from')}</th>
              <th scope="col">{t('app.invest.calc.tax.rate')}</th>
            </tr>
          </thead>
          <tbody>
            {SAVINGS_SCALE.map((b, i) => (
              <tr key={b.from}>
                <th scope="row">
                  {i === SAVINGS_SCALE.length - 1
                    ? t('app.invest.calc.tax.over', { from: eur(b.from) })
                    : t('app.invest.calc.tax.range', {
                        from: eur(b.from),
                        to: eur(SAVINGS_SCALE[i + 1].from),
                      })}
                </th>
                <td>{pct(b.rate, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="inv-note">
        {t('app.invest.calc.tax.footnote')}{' '}
        <a href={SAVINGS_SCALE_SOURCE} target="_blank" rel="noopener noreferrer">
          {t('app.invest.calc.tax.source')}
        </a>
      </p>
    </CalcShell>
  );
}
