import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { bondNetReturn, bondPrice, yieldShock } from '../../domain/bonds';
import { CalcShell, Field, Stat, num, useNumbers } from './Fields';

/** Bond price from yield, effect of a yield change, and net return after Spanish savings tax. */
export function BondCalc() {
  const { t } = useI18n();
  const { eur, n, pct } = useNumbers();
  const [coupon, setCoupon] = useState('3');
  const [yieldPct, setYieldPct] = useState('4');
  const [years, setYears] = useState('10');
  const [shock, setShock] = useState('1');
  const [buy, setBuy] = useState('');
  const [invested, setInvested] = useState('10000');
  const [other, setOther] = useState('0');

  const input = { couponPct: num(coupon), yieldPct: num(yieldPct), years: num(years) };
  const price = bondPrice(input);
  const effect = yieldShock(input, num(shock));
  const paid = num(buy) > 0 ? num(buy) : price;
  const net = bondNetReturn(paid, num(coupon), num(years), num(invested), num(other));

  return (
    <CalcShell title={t('app.invest.calc.bond.title')} intro={t('app.invest.calc.bond.intro')}>
      <div className="inv-form">
        <Field
          id="bd-coupon"
          label={t('app.invest.calc.bond.coupon')}
          value={coupon}
          onChange={setCoupon}
          suffix="%"
          hint={t('app.invest.calc.bond.couponHint')}
        />
        <Field
          id="bd-yield"
          label={t('app.invest.calc.bond.yield')}
          value={yieldPct}
          onChange={setYieldPct}
          suffix="%"
        />
        <Field
          id="bd-years"
          label={t('app.invest.calc.bond.years')}
          value={years}
          onChange={setYears}
        />
        <Field
          id="bd-shock"
          label={t('app.invest.calc.bond.shock')}
          value={shock}
          onChange={setShock}
          suffix="pp"
          hint={t('app.invest.calc.bond.shockHint')}
        />
      </div>
      <div className="inv-stats" aria-live="polite">
        <Stat
          label={t('app.invest.calc.bond.price')}
          value={n(price, 2)}
          tone="accent"
          note={t('app.invest.calc.bond.priceNote')}
        />
        <Stat
          label={t('app.invest.calc.bond.duration')}
          value={`${n(effect.duration, 2)} ${t('app.invest.calc.bond.yearsUnit')}`}
        />
        <Stat
          label={t('app.invest.calc.bond.newPrice')}
          value={n(effect.toPrice, 2)}
          tone={effect.changePct >= 0 ? 'good' : 'bad'}
          note={t('app.invest.calc.bond.change', {
            exact: pct(effect.changePct, 2),
            est: pct(effect.durationEstimatePct, 2),
          })}
        />
      </div>

      <h4 className="inv-sub">{t('app.invest.calc.bond.netTitle')}</h4>
      <div className="inv-form">
        <Field
          id="bd-buy"
          label={t('app.invest.calc.bond.buy')}
          value={buy}
          onChange={setBuy}
          hint={t('app.invest.calc.bond.buyHint', { price: n(price, 2) })}
        />
        <Field
          id="bd-invested"
          label={t('app.invest.calc.bond.invested')}
          value={invested}
          onChange={setInvested}
          suffix="€"
        />
        <Field
          id="bd-other"
          label={t('app.invest.calc.bond.other')}
          value={other}
          onChange={setOther}
          suffix="€"
          hint={t('app.invest.calc.bond.otherHint')}
        />
      </div>
      {!net.valid ? (
        <p className="inv-invalid" role="alert">
          {t('app.invest.calc.invalid')}
        </p>
      ) : (
        <div className="inv-stats" aria-live="polite">
          <Stat label={t('app.invest.calc.bond.grossYield')} value={pct(net.grossYieldPct, 2)} />
          <Stat
            label={t('app.invest.calc.bond.netYield')}
            value={pct(net.netYieldPct, 2)}
            tone="accent"
          />
          <Stat
            label={t('app.invest.calc.bond.grossProfit')}
            value={eur(net.grossProfit)}
            tone="good"
          />
          <Stat label={t('app.invest.calc.bond.tax')} value={eur(net.tax)} tone="bad" />
          <Stat label={t('app.invest.calc.bond.netProfit')} value={eur(net.netProfit)} />
        </div>
      )}
      <p className="inv-note">{t('app.invest.calc.bond.footnote')}</p>
    </CalcShell>
  );
}
