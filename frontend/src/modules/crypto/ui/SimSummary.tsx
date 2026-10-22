import { useI18n, type Locale } from '@core/i18n/I18nContext';
import type { PdfTable } from '@modules/finances/application/tablePdf';
import { ExportButtons } from '@modules/finances/ui/components/ExportButtons';
import { toDisplay, type Display } from '../domain/currency';
import { formatChange, formatDateTime, formatNumber, tone } from '../domain/format';
import type { SimPortfolio } from '../domain/types';
import { useMoney } from './money';
import { Help } from './Notices';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const cents = (value: number) => Math.round(value * 100) / 100;

/**
 * Every operation of the simulator as a table (open ones with their result if sold now), in the
 * currency the console is shown in.
 */
export function historyTable(
  p: SimPortfolio,
  t: Translate,
  locale: Locale,
  display: Display
): PdfTable {
  const when = (iso: string) => formatDateTime(iso, locale);
  const type = (value: string) => t(`app.crypto.order.types.${value}`);
  const money = (euros: number | null) =>
    euros === null ? null : cents(toDisplay(euros, display));
  const price = (euros: number | null) => (euros === null ? null : toDisplay(euros, display));
  const symbol = display.currency === 'USD' ? '$' : '€';
  const columns = [
    'state',
    'coin',
    'quantity',
    'buyPrice',
    'buyDate',
    'buyOrder',
    'sellPrice',
    'sellDate',
    'sellOrder',
    'invested',
    'fees',
    'result',
    'resultPercent',
  ];
  return {
    head: columns.map((c) => t(`app.crypto.csv.${c}`, { symbol })),
    rows: [
      ...p.open.map((o) => [
        t('app.crypto.csv.open'),
        o.symbol,
        o.quantity,
        price(o.entryPrice),
        when(o.openedAt),
        type(o.openType),
        price(o.currentPrice),
        '',
        '',
        money(o.invested),
        money(o.entryFee),
        money(o.pnl),
        o.pnlPercent,
      ]),
      ...p.closed.map((c) => [
        t('app.crypto.csv.closed'),
        c.symbol,
        c.quantity,
        price(c.entryPrice),
        when(c.openedAt),
        type(c.openType),
        price(c.exitPrice),
        when(c.closedAt),
        type(c.closeType),
        money(c.invested),
        money(c.fees),
        money(c.pnl),
        c.pnlPercent,
      ]),
    ],
  };
}

/** How the play-money portfolio is doing: would it gain or lose, and the totals. */
export function SimSummary({ portfolio }: { portfolio: SimPortfolio }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const { account, summary } = portfolio;
  const amount = (value: number | null, signed = false) =>
    value === null ? '—' : money.amount(value, signed);
  const winRate =
    summary.winRate === null
      ? '—'
      : t('app.crypto.summary.winRateValue', {
          rate: formatNumber(summary.winRate, locale),
          wins: summary.wins,
          losses: summary.losses,
        });
  const figures: [string, string, string?][] = [
    ['equity', amount(summary.equity)],
    ['initial', amount(account.initial)],
    ['realized', amount(summary.realized, true), `cc-${tone(summary.realized)}`],
    ['unrealized', amount(summary.unrealized, true), `cc-${tone(summary.unrealized)}`],
    ['trades', String(summary.trades)],
    ['winRate', winRate],
  ];

  return (
    <section className="card cc-summary" aria-labelledby="cc-summary-title">
      <h2 id="cc-summary-title" className="section-title">
        {t('app.crypto.summary.title')}
      </h2>
      <p className={`cc-total cc-${tone(summary.total)}`}>
        {summary.total === null || summary.totalPercent === null
          ? t('app.crypto.summary.noPrices')
          : t(
              summary.total >= 0 ? 'app.crypto.summary.wouldGain' : 'app.crypto.summary.wouldLose',
              {
                amount: money.amount(Math.abs(summary.total)),
                percent: formatChange(summary.totalPercent, locale),
              }
            )}
      </p>
      <dl className="cc-figures">
        {figures.map(([key, value, className]) => (
          <div key={key}>
            <dt>{t(`app.crypto.summary.${key}`)}</dt>
            <dd className={className}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="cc-helps">
        {(['realized', 'unrealized', 'winRate'] as const).map((term) => (
          <Help key={term} term={term} label={t(`app.crypto.help.${term}`)} />
        ))}
      </p>
      <p className="cc-hint">
        {t('app.crypto.summary.since', { date: formatDateTime(account.startedAt, locale) })}
      </p>
    </section>
  );
}

/** The basic history as CSV (free on every plan), in the panel of closed operations. */
export function HistoryExport({ portfolio }: { portfolio: SimPortfolio }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  return (
    <ExportButtons
      name="consola_crypto"
      what={t('app.crypto.csv.what')}
      count={portfolio.open.length + portfolio.closed.length}
      table={() => historyTable(portfolio, t, locale, money.display)}
    />
  );
}
