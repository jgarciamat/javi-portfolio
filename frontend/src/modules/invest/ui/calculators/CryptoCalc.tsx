import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import {
  MAX_LEVERAGE,
  dcaSimulate,
  illustrativePath,
  leveragedPosition,
  parsePrices,
  type Side,
} from '../../domain/crypto';
import { linearTicks } from '../charts/Charts';
import { LineChart } from '../charts/LineChart';
import { CalcShell, Field, Stat, num, useNumbers } from './Fields';

function LeveragePanel() {
  const { t } = useI18n();
  const { eur, n, pct } = useNumbers();
  const [side, setSide] = useState<Side>('long');
  const [margin, setMargin] = useState('1000');
  const [leverage, setLeverage] = useState('10');
  const [entry, setEntry] = useState('100');
  const [exit, setExit] = useState('105');
  const [fee, setFee] = useState('0.05');
  const [funding, setFunding] = useState('0.01');
  const [days, setDays] = useState('3');
  const [maintenance, setMaintenance] = useState('0.5');

  const r = leveragedPosition({
    side,
    margin: num(margin),
    leverage: num(leverage),
    entry: num(entry),
    exit: num(exit),
    feePct: num(fee),
    fundingPctPerDay: num(funding),
    days: num(days),
    maintenancePct: num(maintenance),
  });
  const extreme = num(leverage) >= 10 || (r.valid && r.liquidationDistancePct < 10);

  return (
    <div className="inv-subcalc">
      <h4>{t('app.invest.calc.crypto.leverage')}</h4>
      <div className="inv-form">
        <div className="inv-field">
          <label htmlFor="cr-side">{t('app.invest.calc.crypto.side')}</label>
          <span className="inv-input">
            <select
              id="cr-side"
              className="tx-input"
              value={side}
              onChange={(e) => setSide(e.target.value as Side)}
            >
              <option value="long">{t('app.invest.calc.crypto.long')}</option>
              <option value="short">{t('app.invest.calc.crypto.short')}</option>
            </select>
          </span>
        </div>
        <Field
          id="cr-margin"
          label={t('app.invest.calc.crypto.margin')}
          value={margin}
          onChange={setMargin}
          suffix="€"
        />
        <Field
          id="cr-leverage"
          label={t('app.invest.calc.crypto.leverageX')}
          value={leverage}
          onChange={setLeverage}
          suffix="x"
          hint={t('app.invest.calc.crypto.leverageHint', { max: MAX_LEVERAGE })}
        />
        <Field
          id="cr-entry"
          label={t('app.invest.calc.crypto.entry')}
          value={entry}
          onChange={setEntry}
        />
        <Field
          id="cr-exit"
          label={t('app.invest.calc.crypto.exit')}
          value={exit}
          onChange={setExit}
        />
        <Field
          id="cr-fee"
          label={t('app.invest.calc.crypto.fee')}
          value={fee}
          onChange={setFee}
          suffix="%"
        />
        <Field
          id="cr-funding"
          label={t('app.invest.calc.crypto.funding')}
          value={funding}
          onChange={setFunding}
          suffix="%"
        />
        <Field
          id="cr-days"
          label={t('app.invest.calc.crypto.days')}
          value={days}
          onChange={setDays}
        />
        <Field
          id="cr-maint"
          label={t('app.invest.calc.crypto.maintenance')}
          value={maintenance}
          onChange={setMaintenance}
          suffix="%"
        />
      </div>
      {!r.valid ? (
        <p className="inv-invalid" role="alert">
          {t('app.invest.calc.crypto.invalid', { max: MAX_LEVERAGE })}
        </p>
      ) : (
        <div aria-live="polite">
          {r.liquidated && (
            <p className="inv-liquidated" role="alert">
              {t('app.invest.calc.crypto.liquidated')}
            </p>
          )}
          <div className="inv-stats">
            <Stat label={t('app.invest.calc.crypto.notional')} value={eur(r.notional)} />
            <Stat
              label={t('app.invest.calc.crypto.pnl')}
              value={eur(r.pnlNet, 2)}
              tone={r.pnlNet >= 0 ? 'good' : 'bad'}
              note={t('app.invest.calc.crypto.pnlNote', {
                move: pct(r.priceMovePct, 1),
                fees: eur(r.fees, 2),
                funding: eur(r.funding, 2),
              })}
            />
            <Stat
              label={t('app.invest.calc.crypto.roi')}
              value={pct(r.roiPct, 1)}
              tone={r.roiPct >= 0 ? 'good' : 'bad'}
            />
            <Stat
              label={t('app.invest.calc.crypto.liqPrice')}
              value={n(r.liquidationPrice, 2)}
              tone="warn"
              note={t('app.invest.calc.crypto.liqDistance', {
                pct: pct(r.liquidationDistancePct, 1),
              })}
            />
            <Stat label={t('app.invest.calc.crypto.breakEven')} value={n(r.breakEvenPrice, 2)} />
          </div>
        </div>
      )}
      <p className={`inv-risk${extreme ? ' inv-risk--high' : ''}`} role="note">
        {extreme ? t('app.invest.calc.crypto.riskHigh') : t('app.invest.calc.crypto.risk')}
      </p>
    </div>
  );
}

function DcaPanel() {
  const { t } = useI18n();
  const { eur, n, pct } = useNumbers();
  const [amount, setAmount] = useState('100');
  const [path, setPath] = useState(() => illustrativePath().join(', '));
  const prices = parsePrices(path);
  const r = dcaSimulate(prices, num(amount));

  return (
    <div className="inv-subcalc">
      <h4>{t('app.invest.calc.crypto.dca')}</h4>
      <p className="inv-calc-intro">{t('app.invest.calc.crypto.dcaIntro')}</p>
      <div className="inv-form">
        <Field
          id="dca-amount"
          label={t('app.invest.calc.crypto.dcaAmount')}
          value={amount}
          onChange={setAmount}
          suffix="€"
        />
        <div className="inv-field inv-field--wide">
          <label htmlFor="dca-path">{t('app.invest.calc.crypto.dcaPath')}</label>
          <textarea
            id="dca-path"
            className="tx-input"
            rows={3}
            value={path}
            aria-describedby="dca-path-hint"
            onChange={(e) => setPath(e.target.value)}
          />
          <small id="dca-path-hint" className="inv-hint">
            {t('app.invest.calc.crypto.dcaHint')}
          </small>
          <button
            type="button"
            className="btn-secondary inv-reroll"
            onClick={() => setPath(illustrativePath().join(', '))}
          >
            {t('app.invest.calc.crypto.dcaExample')}
          </button>
        </div>
      </div>
      {!r.valid ? (
        <p className="inv-invalid" role="alert">
          {t('app.invest.calc.crypto.dcaInvalid')}
        </p>
      ) : (
        <div aria-live="polite">
          <div className="inv-stats">
            <Stat
              label={t('app.invest.calc.crypto.dcaInvested')}
              value={eur(r.invested)}
              note={t('app.invest.calc.crypto.dcaBuys', { n: prices.length })}
            />
            <Stat
              label={t('app.invest.calc.crypto.dcaValue')}
              value={eur(r.value)}
              tone={r.profit >= 0 ? 'good' : 'bad'}
              note={`${pct(r.roiPct, 1)}`}
            />
            <Stat label={t('app.invest.calc.crypto.dcaAvg')} value={n(r.averagePrice, 2)} />
            <Stat
              label={t('app.invest.calc.crypto.dcaLump')}
              value={eur(r.lumpSumValue)}
              note={`${pct(r.lumpSumRoiPct, 1)}`}
            />
          </div>
          <LineChart
            title={t('app.invest.calc.crypto.dcaChart')}
            description={t('app.invest.calc.crypto.dcaChartDesc')}
            series={[
              {
                id: 'path',
                label: t('app.invest.calc.crypto.dcaChart'),
                color: '#f59e0b',
                points: prices.map((p, i): [number, number] => [i + 1, p]),
              },
            ]}
            xTicks={linearTicks(1, prices.length, 4)}
            xFormat={(x) => String(x)}
            yTicks={linearTicks(Math.min(...prices), Math.max(...prices), 4)}
            yFormat={(y) => n(y, 0)}
          />
        </div>
      )}
    </div>
  );
}

/** Leverage and liquidation of a crypto position, plus a periodic-purchase (DCA) simulator. */
export function CryptoCalc() {
  const { t } = useI18n();
  return (
    <CalcShell title={t('app.invest.calc.crypto.title')} intro={t('app.invest.calc.crypto.intro')}>
      <LeveragePanel />
      <DcaPanel />
    </CalcShell>
  );
}
