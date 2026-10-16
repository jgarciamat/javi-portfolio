import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { priceCurve } from '../../domain/bonds';
import {
  drawdownSeries,
  horizonFan,
  leverageRoi,
  maxDrawdown,
  randomWalk,
} from '../../domain/simulation';
import type { ChartId } from '../../domain/types';
import { useNumbers } from '../calculators/Fields';
import { LineChart, type Point } from './LineChart';

const GREEN = '#22c55e';
const BLUE = '#38bdf8';
const AMBER = '#f59e0b';
const RED = '#f43f5e';
const VIOLET = '#a78bfa';

/** Round, readable tick values between `lo` and `hi` (about `count` of them). */
export function linearTicks(lo: number, hi: number, count = 4): number[] {
  if (!(hi > lo)) return [lo, lo + 1];
  const raw = (hi - lo) / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * pow >= raw) as number) * pow;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step)
    ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/** 1-2-5 ticks for a logarithmic axis. */
export function logTicks(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let p = Math.floor(Math.log10(lo)); p <= Math.ceil(Math.log10(hi)); p++) {
    for (const m of [1, 2, 5]) {
      const v = m * Math.pow(10, p);
      if (v >= lo * 0.9 && v <= hi * 1.1) out.push(v);
    }
  }
  return out;
}

const toPoints = (values: number[], perYear = 12): Point[] =>
  values.map((v, i) => [i / perYear, v]);

function ChartFrame({
  title,
  note,
  children,
  onReroll,
}: {
  title: string;
  note: string;
  children: ReactNode;
  onReroll?: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="inv-chart-card" aria-label={title}>
      <header>
        <h4>{title}</h4>
        <span className="inv-sim-badge">{t('app.invest.chart.badge')}</span>
      </header>
      <p className="inv-chart-note">{note}</p>
      {children}
      {onReroll && (
        <button type="button" className="btn-secondary inv-reroll" onClick={onReroll}>
          {t('app.invest.chart.reroll')}
        </button>
      )}
      <p className="inv-chart-foot">{t('app.invest.chart.foot')}</p>
    </section>
  );
}

function VolatilityChart() {
  const { t } = useI18n();
  const [seed, setSeed] = useState(3);
  const data = useMemo(() => {
    const walk = (s: number, drift: number, vol: number) =>
      randomWalk({ seed: seed * 10 + s, steps: 60, driftPct: drift, volPct: vol });
    return { bond: walk(1, 0.3, 0.9), equity: walk(2, 0.6, 4.2), crypto: walk(3, 1.8, 14) };
  }, [seed]);
  const all = [...data.bond, ...data.equity, ...data.crypto];
  return (
    <ChartFrame
      title={t('app.invest.chart.vol.title')}
      note={t('app.invest.chart.vol.note')}
      onReroll={() => setSeed((s) => s + 1)}
    >
      <LineChart
        title={t('app.invest.chart.vol.title')}
        description={t('app.invest.chart.vol.desc')}
        logY
        series={[
          {
            id: 'bond',
            label: t('app.invest.chart.vol.bond'),
            color: BLUE,
            points: toPoints(data.bond),
          },
          {
            id: 'equity',
            label: t('app.invest.chart.vol.equity'),
            color: GREEN,
            points: toPoints(data.equity),
          },
          {
            id: 'crypto',
            label: t('app.invest.chart.vol.crypto'),
            color: AMBER,
            points: toPoints(data.crypto),
          },
        ]}
        xTicks={[0, 1, 2, 3, 4, 5]}
        xFormat={(x) => t('app.invest.chart.years', { n: x })}
        yTicks={logTicks(Math.min(...all), Math.max(...all))}
        yFormat={(y) => String(y)}
      />
    </ChartFrame>
  );
}

function DrawdownChart() {
  const { t } = useI18n();
  const { pct } = useNumbers();
  const [seed, setSeed] = useState(5);
  const data = useMemo(() => {
    const prices = randomWalk({ seed: 40 + seed, steps: 120, driftPct: 0.7, volPct: 4.2 });
    return { prices, dd: drawdownSeries(prices), info: maxDrawdown(prices) };
  }, [seed]);
  const { info } = data;
  const months = info.recoveryIndex === null ? null : info.recoveryIndex - info.troughIndex;
  const zero: Point[] = toPoints(data.dd.map(() => 0));
  return (
    <ChartFrame
      title={t('app.invest.chart.dd.title')}
      note={t('app.invest.chart.dd.note')}
      onReroll={() => setSeed((s) => s + 1)}
    >
      <LineChart
        title={t('app.invest.chart.dd.title')}
        description={t('app.invest.chart.dd.desc')}
        series={[
          {
            id: 'price',
            label: t('app.invest.chart.dd.price'),
            color: GREEN,
            points: toPoints(data.prices),
          },
        ]}
        xTicks={[0, 2, 4, 6, 8, 10]}
        xFormat={(x) => t('app.invest.chart.years', { n: x })}
        yTicks={linearTicks(Math.min(...data.prices), Math.max(...data.prices))}
        yFormat={(y) => String(Math.round(y))}
      />
      <LineChart
        title={t('app.invest.chart.dd.under')}
        description={t('app.invest.chart.dd.underDesc')}
        series={[
          {
            id: 'dd',
            label: t('app.invest.chart.dd.under'),
            color: RED,
            points: toPoints(data.dd),
          },
        ]}
        bands={[{ id: 'dd', color: RED, upper: zero, lower: toPoints(data.dd) }]}
        xTicks={[0, 2, 4, 6, 8, 10]}
        xFormat={(x) => t('app.invest.chart.years', { n: x })}
        yTicks={linearTicks(Math.min(...data.dd), 0)}
        yFormat={(y) => `${Math.round(y)} %`}
      />
      <p className="inv-chart-result">
        {info.recoveryIndex === null
          ? t('app.invest.chart.dd.never', { depth: pct(info.depthPct, 0) })
          : t('app.invest.chart.dd.result', {
              depth: pct(info.depthPct, 0),
              months: months as number,
            })}
      </p>
    </ChartFrame>
  );
}

const HORIZONS = [1, 3, 5, 10, 20, 30];

function HorizonChart() {
  const { t } = useI18n();
  const { n, pct } = useNumbers();
  const fan = useMemo(() => horizonFan(HORIZONS, 7, 16), []);
  const pts = (key: 'p5' | 'p25' | 'p50' | 'p75' | 'p95'): Point[] =>
    fan.map((f) => [f.years, f[key]]);
  return (
    <ChartFrame title={t('app.invest.chart.hor.title')} note={t('app.invest.chart.hor.note')}>
      <LineChart
        title={t('app.invest.chart.hor.title')}
        description={t('app.invest.chart.hor.desc')}
        series={[
          { id: 'p50', label: t('app.invest.chart.hor.median'), color: VIOLET, points: pts('p50') },
        ]}
        bands={[
          { id: 'wide', color: VIOLET, lower: pts('p5'), upper: pts('p95') },
          { id: 'mid', color: VIOLET, lower: pts('p25'), upper: pts('p75') },
        ]}
        lines={[{ y: 100, label: t('app.invest.chart.hor.start'), color: RED }]}
        xTicks={[1, 5, 10, 20, 30]}
        xFormat={(x) => t('app.invest.chart.years', { n: x })}
        yTicks={linearTicks(0, Math.max(...fan.map((f) => f.p95)), 4)}
        yFormat={(y) => String(Math.round(y))}
      />
      <div className="inv-table-wrap">
        <table className="inv-table">
          <caption className="sr-only">{t('app.invest.chart.hor.title')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('app.invest.chart.hor.col.years')}</th>
              <th scope="col">{t('app.invest.chart.hor.col.low')}</th>
              <th scope="col">{t('app.invest.chart.hor.col.mid')}</th>
              <th scope="col">{t('app.invest.chart.hor.col.high')}</th>
              <th scope="col">{t('app.invest.chart.hor.col.loss')}</th>
            </tr>
          </thead>
          <tbody>
            {fan.map((f) => (
              <tr key={f.years}>
                <th scope="row">{f.years}</th>
                <td>{n(f.p5, 0)}</td>
                <td>{n(f.p50, 0)}</td>
                <td>{n(f.p95, 0)}</td>
                <td>{pct(f.lossPct, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartFrame>
  );
}

function BondCurveChart() {
  const { t } = useI18n();
  const yields = Array.from({ length: 17 }, (_, i) => i * 0.5);
  const toPts = (years: number): Point[] =>
    priceCurve(3, years, yields).map((p) => [p.yieldPct, p.price]);
  return (
    <ChartFrame title={t('app.invest.chart.bond.title')} note={t('app.invest.chart.bond.note')}>
      <LineChart
        title={t('app.invest.chart.bond.title')}
        description={t('app.invest.chart.bond.desc')}
        series={[
          { id: 'long', label: t('app.invest.chart.bond.long'), color: BLUE, points: toPts(10) },
          {
            id: 'short',
            label: t('app.invest.chart.bond.short'),
            color: GREEN,
            points: toPts(2),
            dashed: true,
          },
        ]}
        lines={[{ y: 100, label: t('app.invest.chart.bond.par'), color: AMBER }]}
        xTicks={[0, 2, 4, 6, 8]}
        xFormat={(x) => `${x} %`}
        yTicks={[70, 80, 90, 100, 110, 120, 130]}
        yFormat={(y) => String(y)}
      />
    </ChartFrame>
  );
}

function LeverageChart() {
  const { t } = useI18n();
  const moves = Array.from({ length: 41 }, (_, i) => i - 20);
  const series = [1, 3, 5, 10].map((lev, i) => ({
    id: `l${lev}`,
    label: t('app.invest.chart.lev.x', { n: lev }),
    color: [BLUE, GREEN, AMBER, RED][i],
    points: moves.map((m): Point => [m, leverageRoi(m, lev)]),
  }));
  return (
    <ChartFrame title={t('app.invest.chart.lev.title')} note={t('app.invest.chart.lev.note')}>
      <LineChart
        title={t('app.invest.chart.lev.title')}
        description={t('app.invest.chart.lev.desc')}
        series={series}
        lines={[{ y: -100, label: t('app.invest.chart.lev.liq'), color: RED }]}
        xTicks={[-20, -10, 0, 10, 20]}
        xFormat={(x) => `${x > 0 ? '+' : ''}${x} %`}
        yTicks={[-100, 0, 100, 200]}
        yFormat={(y) => `${y} %`}
      />
    </ChartFrame>
  );
}

const CHARTS: Record<ChartId, () => ReactElement> = {
  volatility: () => <VolatilityChart />,
  drawdown: () => <DrawdownChart />,
  horizon: () => <HorizonChart />,
  bondCurve: () => <BondCurveChart />,
  leverage: () => <LeverageChart />,
};

export const CHART_IDS = Object.keys(CHARTS) as ChartId[];

export function InvestChart({ id }: { id: ChartId }) {
  return CHARTS[id]();
}
