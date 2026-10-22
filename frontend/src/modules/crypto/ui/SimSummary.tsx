import { useI18n } from '@core/i18n/I18nContext';
import { formatChange, formatDateTime, formatNumber, tone } from '../domain/format';
import type { SimPortfolio } from '../domain/types';
import { useMoney } from './money';
import { Help } from './Notices';

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
