import { useI18n } from '@core/i18n/I18nContext';
import { ScrollRegion } from '@shared/components/ScrollRegion';
import { formatChange, formatDateTime, formatVolume, tone } from '../domain/format';
import type { Candle } from '../domain/types';
import { useMoney } from './money';

/** Rows of the table that replaces the chart for screen readers and keyboards (newest first). */
export const TABLE_ROWS = 30;

/** The last candles of the chart (in the display currency) as a table, for whoever cannot or prefers not to read the chart. */
export function ChartTable({ candles, label }: { candles: Candle[]; label: string }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const rows = candles.slice(-TABLE_ROWS).reverse();
  if (!rows.length) return null;
  return (
    <details className="cc-table-details">
      <summary>{t('app.crypto.table.show', { count: rows.length })}</summary>
      <ScrollRegion label={label} className="cc-table-scroll">
        <table className="cc-table">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>
              <th scope="col">{t('app.crypto.table.time')}</th>
              <th scope="col">{t('app.crypto.chart.open')}</th>
              <th scope="col">{t('app.crypto.chart.high')}</th>
              <th scope="col">{t('app.crypto.chart.low')}</th>
              <th scope="col">{t('app.crypto.chart.close')}</th>
              <th scope="col">{t('app.crypto.table.change')}</th>
              <th scope="col">{t('app.crypto.chart.volume')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const change = ((c.close - c.open) / c.open) * 100;
              return (
                <tr key={c.time}>
                  <th scope="row">{formatDateTime(c.time, locale)}</th>
                  <td>{money.shownPrice(c.open)}</td>
                  <td>{money.shownPrice(c.high)}</td>
                  <td>{money.shownPrice(c.low)}</td>
                  <td>{money.shownPrice(c.close)}</td>
                  <td className={`cc-${tone(change)}`}>{formatChange(change, locale)}</td>
                  <td>{formatVolume(c.volume, locale)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollRegion>
    </details>
  );
}
