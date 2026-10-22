import type { Locale } from '@core/i18n/I18nContext';
import type { PdfTable } from '@modules/finances/application/tablePdf';
import { toDisplay, type Display } from './currency';
import { formatDateTime, intlTag } from './format';
import type {
  BadgeId,
  CryptoRanking,
  PriceAlert,
  SeasonReport,
  SimPortfolio,
  SimStats,
} from './types';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export const BADGE_IDS: BadgeId[] = ['firstTrade', 'firstTakeProfit', 'tenTrades', 'positiveMonth'];

/** «octubre de 2026» from 2026-10 (the 15th, so no time zone moves the month). */
export function monthLabel(month: string, locale: Locale): string {
  return new Date(`${month}-15T12:00:00Z`).toLocaleDateString(intlTag(locale), {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Madrid',
  });
}

/** «octubre» alone. */
export function monthName(month: string, locale: Locale): string {
  return new Date(`${month}-15T12:00:00Z`).toLocaleDateString(intlTag(locale), {
    month: 'long',
    timeZone: 'Europe/Madrid',
  });
}

/** The month before YYYY-MM. */
export function previousMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return m === 1 ? `${year - 1}-12` : `${year}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * The official season ran out of play money: nothing to sell and less than 1 € to buy with.
 * Then a practice portfolio lets the person keep learning until the 1st.
 */
export const outOfBalance = (p: SimPortfolio): boolean =>
  p.portfolio.kind === 'season' && p.account.cash < 1 && !p.open.length && !p.pending.length;

/** The finished season to sum up when a new one starts (last month's), if any. */
export const lastSeason = (p: SimPortfolio) =>
  p.season.history.find((r) => r.season === previousMonth(p.season.month)) ?? null;

// ─── Made-up examples for the Premium previews (shown as examples, never as real) ──────────

export const EXAMPLE_STATS: SimStats = {
  winRate: 60,
  wins: 6,
  losses: 4,
  best: { symbol: 'ETH', direction: 'long', pnl: 182.4, pnlPercent: 9.1, closedAt: '' },
  worst: { symbol: 'SOL', direction: 'short', pnl: -95.3, pnlPercent: -4.8, closedAt: '' },
  averageWin: 64.2,
  averageLoss: -41.7,
  equityDays: [10_000, 10_040, 9_980, 10_110, 10_220, 10_160, 10_310].map((equity, i) => ({
    day: `2000-01-0${i + 1}`,
    equity,
  })),
  hold: { symbol: 'BTC', startPrice: 50_000, price: 51_000, percent: 2 },
};

export const EXAMPLE_ALERTS: PriceAlert[] = [
  {
    id: 'example-1',
    symbol: 'BTC',
    condition: 'above',
    price: 60_000,
    createdAt: '',
    triggeredAt: null,
  },
  {
    id: 'example-2',
    symbol: 'ETH',
    condition: 'below',
    price: 1_800,
    createdAt: '',
    triggeredAt: null,
  },
];

/** The ranking lines of the free plan and Premium (the «Free and Premium» card). */
export const PLAN_LINES = {
  free: ['season', 'ranking', 'practice', 'pending', 'badges'],
  premium: ['stats', 'chart', 'hold', 'alerts', 'practice', 'pending', 'report', 'badge'],
} as const;

/** «1 día» or «3 días»: the key with `One` for a single one. */
export const counted = (t: Translate, key: string, count: number): string =>
  t(count === 1 ? `${key}One` : key, { count });

/** Medal class of a place (gold, silver, bronze; the rest plain). */
export const medal = (place: number): string =>
  place === 1 ? 'gold' : place === 2 ? 'silver' : place === 3 ? 'bronze' : 'plain';

/** What is missing to be ranked, as one sentence. */
export function missingText(me: CryptoRanking['me'], t: Translate): string {
  const parts: string[] = [];
  if (me.missing.trades)
    parts.push(counted(t, 'app.crypto.ranking.missingTrades', me.missing.trades));
  if (me.missing.days) parts.push(counted(t, 'app.crypto.ranking.missingDays', me.missing.days));
  return t('app.crypto.ranking.missing', { what: parts.join(t('app.crypto.ranking.and')) });
}

/** The season report as one table (Premium): a summary and then every operation closed. */
export function reportTable(
  report: SeasonReport,
  t: Translate,
  locale: Locale,
  display: Display
): PdfTable {
  const symbol = display.currency === 'USD' ? '$' : '€';
  const money = (euros: number | null) =>
    euros === null ? '' : Math.round(toDisplay(euros, display) * 100) / 100;
  const price = (euros: number) => toDisplay(euros, display);
  const s = report.stats;
  const summary: (string | number)[][] = [
    [t('app.crypto.report.season'), monthLabel(report.season, locale)],
    [t('app.crypto.report.initial', { symbol }), money(report.initial)],
    ...(report.result
      ? [
          [t('app.crypto.report.final', { symbol }), money(report.result.final)],
          [t('app.crypto.report.percent'), report.result.percent],
          [t('app.crypto.report.place'), report.result.place ?? '—'],
        ]
      : []),
    [t('app.crypto.report.trades'), report.closed.length],
    [t('app.crypto.report.winRate'), s.winRate ?? '—'],
    [t('app.crypto.report.best', { symbol }), money(s.best?.pnl ?? null)],
    [t('app.crypto.report.worst', { symbol }), money(s.worst?.pnl ?? null)],
  ];
  const pad = (row: (string | number)[]) => [...row, ...Array(7 - row.length).fill('')];
  return {
    head: ['coin', 'direction', 'buyPrice', 'sellPrice', 'closeType', 'result', 'closedAt'].map(
      (c) => t(`app.crypto.report.columns.${c}`, { symbol })
    ),
    rows: [
      ...summary.map(pad),
      pad([]),
      ...report.closed.map((c) => [
        c.symbol,
        t(`app.crypto.order.directionShort.${c.direction}`),
        price(c.entryPrice),
        price(c.exitPrice),
        t(`app.crypto.trades.closeTypes.${c.closeType}`),
        money(c.pnl),
        formatDateTime(c.closedAt, locale),
      ]),
    ],
  };
}
