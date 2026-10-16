import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { stockPosition } from '../../domain/stocks';
import { CalcShell, Field, Stat, num, useNumbers } from './Fields';

/** One purchase and sale of shares, with commissions, dividends and Spanish savings tax. */
export function StockCalc() {
  const { t } = useI18n();
  const { eur, pct } = useNumbers();
  const [shares, setShares] = useState('100');
  const [buy, setBuy] = useState('20');
  const [sell, setSell] = useState('25');
  const [feeBuy, setFeeBuy] = useState('3');
  const [feeSell, setFeeSell] = useState('3');
  const [dividend, setDividend] = useState('0.8');
  const [withholding, setWithholding] = useState('19');
  const [other, setOther] = useState('0');

  const r = stockPosition({
    shares: num(shares),
    buyPrice: num(buy),
    sellPrice: num(sell),
    feeBuy: num(feeBuy),
    feeSell: num(feeSell),
    dividendPerShare: num(dividend),
    withholdingPct: num(withholding),
    otherSavingsIncome: num(other),
  });
  const k = (key: string, vars?: Record<string, string | number>) =>
    t(`app.invest.calc.stock.${key}`, vars);

  return (
    <CalcShell title={k('title')} intro={k('intro')}>
      <div className="inv-form">
        <Field id="sk-shares" label={k('shares')} value={shares} onChange={setShares} />
        <Field id="sk-buy" label={k('buy')} value={buy} onChange={setBuy} suffix="€" />
        <Field id="sk-sell" label={k('sell')} value={sell} onChange={setSell} suffix="€" />
        <Field id="sk-feebuy" label={k('feeBuy')} value={feeBuy} onChange={setFeeBuy} suffix="€" />
        <Field
          id="sk-feesell"
          label={k('feeSell')}
          value={feeSell}
          onChange={setFeeSell}
          suffix="€"
        />
        <Field
          id="sk-dividend"
          label={k('dividend')}
          value={dividend}
          onChange={setDividend}
          suffix="€"
          hint={k('dividendHint')}
        />
        <Field
          id="sk-withholding"
          label={k('withholding')}
          value={withholding}
          onChange={setWithholding}
          suffix="%"
          hint={k('withholdingHint')}
        />
        <Field
          id="sk-other"
          label={k('other')}
          value={other}
          onChange={setOther}
          suffix="€"
          hint={k('otherHint')}
        />
      </div>
      {!r.valid ? (
        <p className="inv-invalid" role="alert">
          {k('invalid')}
        </p>
      ) : (
        <div className="inv-stats" aria-live="polite">
          <Stat label={k('invested')} value={eur(r.invested, 2)} note={k('investedNote')} />
          <Stat
            label={k('capital')}
            value={eur(r.capitalGain, 2)}
            tone={r.capitalGain >= 0 ? 'good' : 'bad'}
          />
          <Stat
            label={k('dividends')}
            value={eur(r.dividends, 2)}
            note={k('yieldNote', { pct: pct(r.yieldOnCostPct, 2) })}
          />
          <Stat label={k('gross')} value={eur(r.grossGain, 2)} />
          <Stat label={k('tax')} value={eur(r.tax, 2)} tone="bad" />
          <Stat
            label={r.toSettle >= 0 ? k('toPay') : k('toGet')}
            value={eur(Math.abs(r.toSettle), 2)}
            note={k('withheldNote', { amount: eur(r.withheld, 2) })}
          />
          <Stat
            label={k('net')}
            value={eur(r.netGain, 2)}
            tone="accent"
            note={k('netReturn', { pct: pct(r.netReturnPct, 2) })}
          />
        </div>
      )}
      <p className="inv-note">{k('footnote')}</p>
    </CalcShell>
  );
}
