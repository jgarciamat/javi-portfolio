import type { CSSProperties } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { storage } from '@shared/utils/storage';
import { CHART_INTERVALS } from '../domain/chart';
import './css/Skeleton.css';

/** «Turn the phone», shown once on a phone held upright: its room is kept while loading too. */
export const HINT_KEY = 'mm_crypto_rotate_hint';

/** Made-up candles for the outline of the chart: a gentle wave, never prices. [x, top, bottom] */
const CANDLES: [number, number, number][] = Array.from({ length: 18 }, (_, i) => {
  const mid = 52 - Math.sin(i / 2.6) * 14 - i * 0.8;
  const body = 5 + ((i * 7) % 5);
  return [6 + i * 5, mid - body / 2, mid + body / 2];
});

const width = (w: string) => ({ '--w': w }) as CSSProperties;

/**
 * The frame of a chart without data: a faint grid and the silhouettes of a few candles, drawn
 * with lines only. Used while the console loads and over the chart while other candles come.
 */
export function ChartFrame({ className = '' }: { className?: string }) {
  return (
    <div className={`cc-skel-canvas ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        {[20, 40, 60, 80].map((y) => (
          <line key={`h${y}`} className="cc-skel-grid" x1="0" x2="100" y1={y} y2={y} />
        ))}
        {[16, 33, 50, 67, 84].map((x) => (
          <line key={`v${x}`} className="cc-skel-grid" x1={x} x2={x} y1="0" y2="100" />
        ))}
        {CANDLES.map(([x, top, bottom]) => (
          <g key={x} className="cc-skel-candle">
            <line x1={x} x2={x} y1={top - 4} y2={bottom + 4} />
            <rect x={x - 1.4} y={top} width="2.8" height={bottom - top} />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** A line of text as a thin outline, `w` wide. */
function Bar({ w, className = '' }: { w: string; className?: string }) {
  return <span className={`cc-skel-bar ${className}`.trim()} style={width(w)} />;
}

function CoinRow() {
  return (
    <li>
      <span className="cc-coin cc-skel-coin">
        <span className="cc-skel-dot" />
        <span className="cc-skel-col">
          <Bar w="70%" />
          <Bar w="45%" />
        </span>
        <span className="cc-skel-col cc-skel-col--end">
          <Bar w="4.5rem" />
          <Bar w="2.75rem" />
        </span>
      </span>
    </li>
  );
}

/**
 * The drawing bar: the same pieces and sizes (five tools, five colours, «Undo» and «Delete all»),
 * so it wraps where the real one does.
 */
function DrawRow() {
  const squares = (n: number) =>
    Array.from({ length: n }, (_, i) => <span key={i} className="cc-skel-chip cc-skel-tool" />);
  return (
    <div className="cc-skel-draw">
      {squares(5)}
      <i />
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="cc-skel-chip cc-skel-swatch" />
      ))}
      <i />
      {squares(2)}
    </div>
  );
}

/** The chart column: its header, the layer chips, «Learn», the frame, the zoom bar and the notes. */
function ChartColumn() {
  const hint = storage.get(HINT_KEY) !== '1';
  return (
    <div className="cc-skel-chart">
      {hint && <span className="cc-skel-box cc-skel-rotate" />}
      <div className="cc-skel-row cc-skel-head">
        <Bar w="55%" />
        <Bar w="9rem" />
      </div>
      <div className="cc-skel-row cc-skel-chips">
        {['4rem', '5.5rem', '4.5rem', '6rem', '5rem', '4rem', '6.5rem', '5rem', '4.5rem'].map(
          (w, i) => (
            <span key={i} className="cc-skel-chip" style={width(w)} />
          )
        )}
      </div>
      <span className="cc-skel-box cc-skel-learn" />
      <DrawRow />
      <ChartFrame />
      <div className="cc-skel-row cc-skel-tools">
        {['4.5rem', '4.5rem', '5rem', '3.5rem', '7.5rem'].map((w, i) => (
          <span key={i} className="cc-skel-chip" style={width(w)} />
        ))}
      </div>
      <div className="cc-skel-lines cc-skel-help">
        <Bar w="92%" />
        <Bar w="60%" />
      </div>
      <div className="cc-skel-lines cc-skel-credit">
        <Bar w="40%" />
      </div>
      <div className="cc-skel-lines cc-skel-table">
        <Bar w="14rem" />
      </div>
    </div>
  );
}

/**
 * While the console loads: only the silhouette of the market panel (the coin column, the price
 * with the candle sizes, the figures of the day and the chart with its grid), as thin blue
 * outlines with a slow glow, the same size as the panel that replaces it. No text and no figure
 * on screen; screen readers hear «Loading the console…».
 */
export function ConsoleSkeleton() {
  const { t } = useI18n();
  return (
    <div className="cc-skeleton" role="status" aria-busy="true">
      <span className="sr-only">{t('app.crypto.skeleton.label')}</span>
      <div className="card cc-market cc-skel" aria-hidden="true">
        <Bar w="8rem" className="cc-skel-title" />
        <div className="cc-market-grid">
          <div className="cc-coins">
            <div className="cc-coins-title">
              <Bar w="4rem" />
            </div>
            <ul className="cc-coins-list">
              {Array.from({ length: 12 }, (_, i) => (
                <CoinRow key={i} />
              ))}
            </ul>
          </div>
          <div className="cc-market-top">
            <div className="cc-market-head">
              <div className="cc-skel-quote">
                <span className="cc-skel-dot cc-skel-dot--big" />
                <Bar w="9rem" />
                <span className="cc-skel-price" />
                <Bar w="11rem" className="cc-skel-changes" />
              </div>
              <div className="cc-market-controls">
                <div className="cc-segmented cc-intervals">
                  {CHART_INTERVALS.map((i) => (
                    <span key={i} className="cc-skel-seg" />
                  ))}
                </div>
                <div className="cc-segmented cc-currency">
                  <span className="cc-skel-seg cc-skel-seg--wide" />
                  <span className="cc-skel-seg cc-skel-seg--wide" />
                </div>
              </div>
            </div>
            <div className="cc-stats">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i}>
                  <Bar w="60%" />
                  <Bar w="80%" />
                </div>
              ))}
            </div>
          </div>
          <div className="cc-market-chart">
            <ChartColumn />
          </div>
        </div>
      </div>
    </div>
  );
}
