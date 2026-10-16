import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import {
  BAND_SPREAD_PP,
  MAX_FUND_YEARS,
  projectFund,
  type FundResult,
  type FundYear,
} from '../../domain/compound';
import { linearTicks } from '../charts/Charts';
import { LineChart, type Point } from '../charts/LineChart';
import { CalcShell, Field, Stat, num, useNumbers } from './Fields';

/** Contributions, the central scenario and the pessimistic and optimistic band. */
function CompoundChart({ result: r, start: initialAmount }: { result: FundResult; start: number }) {
  const { t } = useI18n();
  const start = Math.max(0, initialAmount);
  const line = (rows: FundYear[], key: 'balance' | 'contributed'): Point[] => [
    [0, start],
    ...rows.map((row): Point => [row.year, row[key]]),
  ];
  const top = Math.max(...r.optimistic.map((y) => y.balance), 1);
  return (
    <LineChart
      title={t('app.invest.calc.compound.chart')}
      description={t('app.invest.calc.compound.chartDesc', { spread: BAND_SPREAD_PP })}
      series={[
        {
          id: 'contributed',
          label: t('app.invest.calc.compound.contributed'),
          color: '#94a3b8',
          points: line(r.yearly, 'contributed'),
        },
        {
          id: 'central',
          label: t('app.invest.calc.compound.central'),
          color: '#6366f1',
          points: line(r.yearly, 'balance'),
        },
        {
          id: 'low',
          label: t('app.invest.calc.compound.low', { spread: BAND_SPREAD_PP }),
          color: '#f43f5e',
          dashed: true,
          points: line(r.pessimistic, 'balance'),
        },
        {
          id: 'high',
          label: t('app.invest.calc.compound.high', { spread: BAND_SPREAD_PP }),
          color: '#22c55e',
          dashed: true,
          points: line(r.optimistic, 'balance'),
        },
      ]}
      bands={[
        {
          id: 'range',
          color: '#6366f1',
          lower: line(r.pessimistic, 'balance'),
          upper: line(r.optimistic, 'balance'),
        },
      ]}
      xTicks={linearTicks(0, r.yearly.length, 5)}
      xFormat={(x) => t('app.invest.chart.years', { n: x })}
      yTicks={linearTicks(0, top, 4)}
      yFormat={(y) => (y >= 1000 ? `${Math.round(y / 1000)}k` : String(Math.round(y)))}
    />
  );
}

/** Compound growth with an index fund or ETF: nominal and real value, fees, tax and scenarios. */
export function CompoundCalc() {
  const { t } = useI18n();
  const { eur, pct } = useNumbers();
  const [initial, setInitial] = useState('5000');
  const [monthly, setMonthly] = useState('200');
  const [years, setYears] = useState('30');
  const [ret, setRet] = useState('7');
  const [ter, setTer] = useState('0.2');
  const [inflation, setInflation] = useState('2');
  const [withTax, setWithTax] = useState(true);

  const r = projectFund({
    initial: num(initial),
    monthly: num(monthly),
    years: num(years),
    returnPct: num(ret),
    terPct: num(ter),
    inflationPct: num(inflation),
    withTax,
  });
  return (
    <CalcShell
      title={t('app.invest.calc.compound.title')}
      intro={t('app.invest.calc.compound.intro')}
    >
      <div className="inv-form">
        <Field
          id="cc-initial"
          label={t('app.invest.calc.compound.initial')}
          value={initial}
          onChange={setInitial}
          suffix="€"
        />
        <Field
          id="cc-monthly"
          label={t('app.invest.calc.compound.monthly')}
          value={monthly}
          onChange={setMonthly}
          suffix="€"
        />
        <Field
          id="cc-years"
          label={t('app.invest.calc.compound.years')}
          value={years}
          onChange={setYears}
          hint={t('app.invest.calc.compound.yearsHint', { max: MAX_FUND_YEARS })}
        />
        <Field
          id="cc-return"
          label={t('app.invest.calc.compound.return')}
          value={ret}
          onChange={setRet}
          suffix="%"
        />
        <Field
          id="cc-ter"
          label={t('app.invest.calc.compound.ter')}
          value={ter}
          onChange={setTer}
          suffix="%"
        />
        <Field
          id="cc-inflation"
          label={t('app.invest.calc.compound.inflation')}
          value={inflation}
          onChange={setInflation}
          suffix="%"
        />
      </div>
      <label className="inv-check">
        <input type="checkbox" checked={withTax} onChange={(e) => setWithTax(e.target.checked)} />
        {t('app.invest.calc.compound.withTax')}
      </label>

      {!r.valid ? (
        <p className="inv-invalid" role="alert">
          {t('app.invest.calc.invalid')}
        </p>
      ) : (
        <div aria-live="polite">
          <div className="inv-stats">
            <Stat
              label={t('app.invest.calc.compound.final')}
              value={eur(r.finalBalance)}
              tone="accent"
            />
            <Stat label={t('app.invest.calc.compound.contributed')} value={eur(r.contributed)} />
            <Stat label={t('app.invest.calc.compound.gain')} value={eur(r.gain)} tone="good" />
            <Stat
              label={t('app.invest.calc.compound.fees')}
              value={eur(r.feesPaid)}
              tone="warn"
              note={t('app.invest.calc.compound.feeImpact', { amount: eur(r.feeImpact) })}
            />
            <Stat label={t('app.invest.calc.compound.tax')} value={eur(r.tax)} tone="bad" />
            <Stat label={t('app.invest.calc.compound.net')} value={eur(r.netAfterTax)} />
            <Stat
              label={t('app.invest.calc.compound.real')}
              value={eur(r.realNet)}
              note={t('app.invest.calc.compound.realNote', { rate: pct(num(inflation), 1) })}
            />
          </div>
          <CompoundChart result={r} start={num(initial)} />
          <p className="inv-note">{t('app.invest.calc.compound.etfNote')}</p>
        </div>
      )}
      <p className="inv-note">{t('app.invest.calc.compound.footnote')}</p>
    </CalcShell>
  );
}
