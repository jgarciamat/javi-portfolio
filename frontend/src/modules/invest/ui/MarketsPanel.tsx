import { useEffect, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { intlLocale } from '@shared/utils/format';
import {
  EXCHANGES,
  MADRID_TZ,
  formatDuration,
  marketStatus,
  toSpanishTime,
  type Exchange,
  type MarketState,
} from '../domain/markets';

const REFRESH_MS = 30_000;

/** The current time, refreshed every 30 seconds. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

const STATE_ICON: Record<MarketState, string> = {
  open: '🟢',
  break: '🟡',
  pre: '🟠',
  after: '🟠',
  closed: '⚪',
};

function range(pair: [string, string], tz: string, at: Date, spanish: boolean): string {
  const [from, to] = pair.map((h) => (spanish ? toSpanishTime(h, tz, at).text : h));
  return `${from}–${to}`;
}

function Hours({ ex, at, spanish }: { ex: Exchange; at: Date; spanish: boolean }) {
  const { t } = useI18n();
  return (
    <>
      {ex.sessions.map((s) => (
        <span key={s[0]} className="inv-hours-line">
          {range(s, ex.tz, at, spanish)}
        </span>
      ))}
      {ex.pre && (
        <small className="inv-hours-extra">
          {t('app.invest.markets.pre')} {range(ex.pre, ex.tz, at, spanish)}
        </small>
      )}
      {ex.after && (
        <small className="inv-hours-extra">
          {t('app.invest.markets.after')} {range(ex.after, ex.tz, at, spanish)}
        </small>
      )}
    </>
  );
}

/** Table of exchanges with local and Spanish hours and an "open now" indicator. */
export function MarketsPanel({ now: fixedNow }: { now?: Date }) {
  const { t, locale } = useI18n();
  const live = useNow();
  const now = fixedNow ?? live;
  const rows = EXCHANGES.map((ex) => ({ ex, status: marketStatus(ex, now) }));
  const openCount = rows.filter((r) => r.status.state === 'open').length;
  const clock = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: MADRID_TZ,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
  const clockText = clock.charAt(0).toUpperCase() + clock.slice(1);

  return (
    <section className="inv-markets" aria-label={t('app.invest.markets.title')}>
      <div className="inv-markets-head">
        <p className="inv-markets-clock">
          <strong>{t('app.invest.markets.now')}</strong> {clockText}
        </p>
        <p className="inv-markets-count" role="status">
          {t('app.invest.markets.openCount', { open: openCount, total: rows.length })}
        </p>
      </div>
      <div className="inv-table-wrap">
        <table className="inv-table inv-markets-table">
          <caption className="sr-only">{t('app.invest.markets.title')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('app.invest.markets.col.market')}</th>
              <th scope="col">{t('app.invest.markets.col.local')}</th>
              <th scope="col">{t('app.invest.markets.col.spain')}</th>
              <th scope="col">{t('app.invest.markets.col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ ex, status }) => (
              <tr key={ex.id} data-state={status.state}>
                <th scope="row">
                  <div className="inv-mkt-name">
                    <span className="inv-flag" aria-hidden="true">
                      {ex.flag}
                    </span>
                    <span>
                      {ex.name}
                      <small>
                        {ex.city} · {ex.indices.join(', ')}
                      </small>
                    </span>
                  </div>
                </th>
                <td data-label={t('app.invest.markets.col.local')}>
                  <Hours ex={ex} at={now} spanish={false} />
                </td>
                <td data-label={t('app.invest.markets.col.spain')}>
                  <Hours ex={ex} at={now} spanish />
                </td>
                <td data-label={t('app.invest.markets.col.status')}>
                  <span className={`inv-badge inv-badge--${status.state}`}>
                    <span aria-hidden="true">{STATE_ICON[status.state]}</span>{' '}
                    {t(`app.invest.markets.state.${status.state}`)}
                  </span>
                  {status.minutesToChange !== null && (
                    <small className="inv-hours-extra">
                      {t('app.invest.markets.change', {
                        time: formatDuration(status.minutesToChange),
                      })}
                    </small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="inv-note">{t('app.invest.markets.note')}</p>
      <details className="inv-notes">
        <summary>{t('app.invest.markets.details')}</summary>
        <ul>
          {EXCHANGES.map((ex) => (
            <li key={ex.id}>
              <strong>{ex.name}.</strong> {ex.note}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
