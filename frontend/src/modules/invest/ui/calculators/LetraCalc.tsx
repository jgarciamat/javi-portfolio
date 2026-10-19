import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { LETRA_TERMS, letraPrice, letraReturn } from '../../domain/treasury';
import { CalcShell, Field, Stat, num, useNumbers } from './Fields';

/**
 * Return of a Treasury bill held to maturity: from the auction rate (or the price paid), the face
 * value and the days, the yearly rate, the TAE and what is left after fees and savings tax.
 */
export function LetraCalc() {
  const { t } = useI18n();
  const { eur, n, pct } = useNumbers();
  const [rate, setRate] = useState('3');
  const [price, setPrice] = useState('');
  const [days, setDays] = useState('364');
  const [nominal, setNominal] = useState('10000');
  const [fees, setFees] = useState('');
  const [other, setOther] = useState('0');

  const fromRate = letraPrice(num(rate), num(days));
  const paidPrice = num(price) > 0 ? num(price) : fromRate;
  const result = letraReturn({
    price: paidPrice,
    nominal: num(nominal),
    days: num(days),
    fees: fees.trim() === '' ? undefined : num(fees),
    otherSavingsIncome: num(other),
  });
  const term = LETRA_TERMS.find((x) => String(x.days) === days.trim());

  return (
    <CalcShell title={t('app.invest.calc.letra.title')} intro={t('app.invest.calc.letra.intro')}>
      <div className="inv-form">
        <div className="inv-field">
          <label htmlFor="lt-term">{t('app.invest.calc.letra.term')}</label>
          <select
            id="lt-term"
            className="tx-input"
            value={term ? String(term.days) : ''}
            onChange={(e) => setDays(e.target.value)}
          >
            <option value="" disabled>
              {t('app.invest.calc.letra.termOther')}
            </option>
            {LETRA_TERMS.map((x) => (
              <option key={x.months} value={String(x.days)}>
                {t('app.invest.calc.letra.termOption', { months: x.months, days: x.days })}
              </option>
            ))}
          </select>
        </div>
        <Field
          id="lt-days"
          label={t('app.invest.calc.letra.days')}
          value={days}
          onChange={setDays}
          hint={t('app.invest.calc.letra.daysHint')}
        />
        <Field
          id="lt-rate"
          label={t('app.invest.calc.letra.rate')}
          value={rate}
          onChange={setRate}
          suffix="%"
          hint={t('app.invest.calc.letra.rateHint')}
        />
        <Field
          id="lt-price"
          label={t('app.invest.calc.letra.price')}
          value={price}
          onChange={setPrice}
          suffix="%"
          hint={t('app.invest.calc.letra.priceHint', { price: n(fromRate, 3) })}
        />
        <Field
          id="lt-nominal"
          label={t('app.invest.calc.letra.nominal')}
          value={nominal}
          onChange={setNominal}
          suffix="€"
          hint={t('app.invest.calc.letra.nominalHint')}
        />
        <Field
          id="lt-fees"
          label={t('app.invest.calc.letra.fees')}
          value={fees}
          onChange={setFees}
          suffix="€"
          hint={t('app.invest.calc.letra.feesHint')}
        />
        <Field
          id="lt-other"
          label={t('app.invest.calc.bond.other')}
          value={other}
          onChange={setOther}
          suffix="€"
          hint={t('app.invest.calc.bond.otherHint')}
        />
      </div>
      {!result.valid ? (
        <p className="inv-invalid" role="alert">
          {t('app.invest.calc.letra.invalid')}
        </p>
      ) : (
        <>
          {result.notMultiple && (
            <p className="inv-invalid" role="status">
              {t('app.invest.calc.letra.notMultiple')}
            </p>
          )}
          <div className="inv-stats" aria-live="polite">
            <Stat
              label={t('app.invest.calc.letra.paid')}
              value={eur(result.paid, 2)}
              note={t('app.invest.calc.letra.paidNote', { price: n(paidPrice, 3) })}
            />
            <Stat label={t('app.invest.calc.letra.received')} value={eur(result.received, 2)} />
            <Stat
              label={t('app.invest.calc.letra.gross')}
              value={eur(result.grossGain, 2)}
              tone={result.grossGain >= 0 ? 'good' : 'bad'}
            />
            <Stat
              label={t('app.invest.calc.letra.ratePct')}
              value={pct(result.ratePct, 3)}
              note={t('app.invest.calc.letra.rateNote')}
            />
            <Stat label={t('app.invest.calc.letra.grossTae')} value={pct(result.grossTaePct, 2)} />
            <Stat label={t('app.invest.calc.letra.feesStat')} value={eur(result.fees, 2)} />
            <Stat
              label={t('app.invest.calc.letra.tax')}
              value={eur(result.tax, 2)}
              tone="bad"
              note={t('app.invest.calc.letra.taxNote')}
            />
            <Stat
              label={t('app.invest.calc.letra.net')}
              value={eur(result.netGain, 2)}
              tone="accent"
            />
            <Stat label={t('app.invest.calc.letra.netTae')} value={pct(result.netTaePct, 2)} />
          </div>
        </>
      )}
      <p className="inv-note">{t('app.invest.calc.letra.footnote')}</p>
    </CalcShell>
  );
}
