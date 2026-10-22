import { useState, type FormEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import type { Ranking } from '../application/useRanking';
import { formatChange, intlTag } from '../domain/format';
import { counted, medal, missingText, monthName } from '../domain/season';
import type { CryptoRanking, RankingRow } from '../domain/types';
import './css/Season.css';

function Podium({ rows }: { rows: RankingRow[] }) {
  const { t, locale } = useI18n();
  return (
    <ol className="cc-podium">
      {rows.map((r) => (
        <li key={r.place} className={`cc-podium-row cc-medal--${medal(r.place)}`}>
          <span
            className="cc-medal"
            aria-label={t('app.crypto.ranking.placeLabel', { place: r.place })}
          >
            {r.place}
          </span>
          <span className="cc-podium-alias">
            {r.alias}
            {r.premium && (
              <span className="cc-premium-mark" title={t('app.crypto.ranking.premiumMark')}>
                <Icon name="star" />
                <span className="sr-only">{t('app.crypto.ranking.premiumMark')}</span>
              </span>
            )}
          </span>
          <span className={`cc-podium-percent cc-${r.percent >= 0 ? 'up' : 'down'}`}>
            {formatChange(r.percent, locale)}
          </span>
          <span className="cc-hint">{counted(t, 'app.crypto.ranking.trades', r.trades)}</span>
        </li>
      ))}
    </ol>
  );
}

function Mine({ ranking }: { ranking: CryptoRanking }) {
  const { t, locale } = useI18n();
  const { me, settings } = ranking;
  const result =
    me.percent === null
      ? ''
      : t('app.crypto.ranking.myResult', { percent: formatChange(me.percent, locale) });
  return (
    <div className="cc-ranking-me" role="status">
      <p>
        <b>{t('app.crypto.ranking.meTitle')}</b> {result}
      </p>
      <p>
        {!settings.optIn
          ? t('app.crypto.ranking.notIn')
          : me.place
            ? t('app.crypto.ranking.myPlace', { place: me.place, total: ranking.participants })
            : missingText(me, t)}
      </p>
      <p className="cc-hint">{t('app.crypto.ranking.onlyYou')}</p>
    </div>
  );
}

function Settings({ ranking, state }: { ranking: CryptoRanking; state: Ranking }) {
  const { t } = useI18n();
  const { settings, rules } = ranking;
  const [alias, setAlias] = useState(settings.alias ?? settings.suggestedAlias ?? '');
  const busy = state.action.pending;
  const save = (event: FormEvent) => {
    event.preventDefault();
    void state.save({ optIn: settings.optIn, alias });
  };
  return (
    <div className="cc-ranking-settings">
      <label className="cc-switch">
        <input
          type="checkbox"
          role="switch"
          checked={settings.optIn}
          disabled={busy}
          onChange={(e) =>
            void state.save({ optIn: e.target.checked, ...(alias ? { alias } : {}) })
          }
        />
        <span>{t('app.crypto.ranking.optIn')}</span>
      </label>
      <p className="cc-hint">{t('app.crypto.ranking.optInHint')}</p>
      <form className="cc-alias" onSubmit={save}>
        <label>
          <span className="cc-label">{t('app.crypto.ranking.alias')}</span>
          <input
            value={alias}
            maxLength={rules.aliasMax}
            minLength={rules.aliasMin}
            autoComplete="nickname"
            onChange={(e) => setAlias(e.target.value)}
          />
        </label>
        <button type="submit" className="btn-secondary" disabled={busy || !alias.trim()}>
          {t('app.crypto.ranking.saveAlias')}
        </button>
      </form>
      <p className="cc-hint">
        {t('app.crypto.ranking.aliasHint', { min: rules.aliasMin, max: rules.aliasMax })}
      </p>
      {state.action.error && (
        <p className="error-banner" role="alert">
          {state.action.error}
        </p>
      )}
    </div>
  );
}

/** «Ranking of the month»: voluntary, top 5 by return, prize and rules in plain words. */
export function RankingCard({ state }: { state: Ranking }) {
  const { t, locale } = useI18n();
  const { ranking, error } = state;
  if (!ranking) {
    return error ? (
      <section className="card cc-ranking">
        <p className="error-banner" role="alert">
          {error}
        </p>
      </section>
    ) : null;
  }
  const { rules, season, previous } = ranking;
  return (
    <section className="card cc-ranking" aria-labelledby="cc-ranking-title">
      <h2 id="cc-ranking-title" className="section-title">
        <Icon name="star" />{' '}
        {t('app.crypto.ranking.title', { month: monthName(season.month, locale) })}
      </h2>
      <p className="cc-countdown" role="timer">
        {season.daysLeft === 0
          ? t('app.crypto.ranking.endsToday')
          : counted(t, 'app.crypto.ranking.endsIn', season.daysLeft)}
      </p>
      <p className="cc-prize">
        <Icon name="gift" /> {t('app.crypto.ranking.prize', { days: rules.prizeDays })}
      </p>
      {ranking.top.length ? (
        <Podium rows={ranking.top} />
      ) : (
        <p className="cc-hint">{t('app.crypto.ranking.empty')}</p>
      )}
      <Mine ranking={ranking} />
      <Settings key={String(ranking.settings.alias)} ranking={ranking} state={state} />
      <details className="cc-rules">
        <summary>{t('app.crypto.ranking.rulesTitle')}</summary>
        <ul>
          {(['who', 'metric', 'minimums', 'ties', 'prize', 'fair', 'abuse', 'dates'] as const).map(
            (rule) => (
              <li key={rule}>
                {t(`app.crypto.ranking.rules.${rule}`, {
                  initial: rules.initial.toLocaleString(intlTag(locale)),
                  trades: rules.minTrades,
                  days: rules.minDays,
                  size: rules.size,
                })}
              </li>
            )
          )}
        </ul>
      </details>
      {previous && (
        <div className="cc-previous">
          <h3 className="cc-subtitle">
            {t('app.crypto.ranking.previous', { month: monthName(previous.month, locale) })}
          </h3>
          <Podium rows={previous.top} />
        </div>
      )}
    </section>
  );
}
