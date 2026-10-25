import { useState, type FormEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { storage } from '@shared/utils/storage';
import type { Ranking } from '../application/useRanking';
import { formatChange, intlTag, pnl } from '../domain/format';
import { counted, medal, missingText, monthName } from '../domain/season';
import type { CryptoRanking, RankingRow } from '../domain/types';
import './css/Season.css';

/** The field of the alias: «Change alias» of the first notice takes the person there. */
export const ALIAS_FIELD_ID = 'cc-alias';
/** Set once the first notice about the ranking has been dismissed on this device. */
export const RANKING_INTRO_KEY = 'mm_crypto_ranking_intro';

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
          <span className={`cc-podium-percent ${pnl(r.percent)}`}>
            {formatChange(r.percent, locale)}
          </span>
          <span className="cc-hint">{counted(t, 'app.crypto.ranking.trades', r.trades)}</span>
        </li>
      ))}
    </ol>
  );
}

/** How many operations of the minimum are closed, as a bar and in words («3 de 5»). */
function Progress({ ranking }: { ranking: CryptoRanking }) {
  const { t } = useI18n();
  const total = ranking.rules.minTrades;
  const done = Math.min(ranking.me.trades, total);
  const label = t('app.crypto.ranking.progress', { count: done, total });
  return (
    <div className="cc-ranking-progress">
      <div
        className="cc-ranking-bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <span style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <span className="cc-hint">{label}</span>
    </div>
  );
}

/**
 * The person's month: their place, else what is missing (with the progress), else why a person
 * with the operations does not show yet (no market price of what they have open).
 */
function Mine({ ranking }: { ranking: CryptoRanking }) {
  const { t, locale } = useI18n();
  const { me, rules } = ranking;
  return (
    <div className="cc-ranking-me" role="status">
      <p>
        <b>{t('app.crypto.ranking.meTitle')}</b>{' '}
        {me.percent !== null && (
          <span className={pnl(me.percent)}>
            {t('app.crypto.ranking.myResult', { percent: formatChange(me.percent, locale) })}
          </span>
        )}
      </p>
      {me.place ? (
        <p>{t('app.crypto.ranking.myPlace', { place: me.place, total: ranking.participants })}</p>
      ) : me.qualified ? (
        <p>{t('app.crypto.ranking.pending', { trades: rules.minTrades })}</p>
      ) : (
        <>
          <p>{missingText(me, t)}</p>
          <Progress ranking={ranking} />
        </>
      )}
    </div>
  );
}

/** The alias (everybody is in the ranking with one) and what the others see, in plain words. */
function Settings({ ranking, state }: { ranking: CryptoRanking; state: Ranking }) {
  const { t } = useI18n();
  const { settings, rules } = ranking;
  const [alias, setAlias] = useState(settings.alias);
  const busy = state.action.pending;
  const save = (event: FormEvent) => {
    event.preventDefault();
    void state.save({ alias });
  };
  return (
    <div className="cc-ranking-settings">
      <form className="cc-alias" onSubmit={save}>
        <label>
          <span className="cc-label">{t('app.crypto.ranking.alias')}</span>
          <input
            id={ALIAS_FIELD_ID}
            value={alias}
            maxLength={rules.aliasMax}
            minLength={rules.aliasMin}
            autoComplete="nickname"
            onChange={(e) => setAlias(e.target.value)}
          />
        </label>
        <button type="submit" className="cc-save" disabled={busy || !alias.trim()}>
          {t('app.crypto.ranking.saveAlias')}
        </button>
      </form>
      <p className="cc-alias-notice">
        <Icon name="eye" />
        <span>{t('app.crypto.ranking.aliasNotice')}</span>
      </p>
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

/**
 * The first time in the console: everybody appears in the ranking of the month, with which alias,
 * and how to change it. Dismissed once on this device (only a reminder: the card says it too).
 */
export function RankingIntro({ ranking }: { ranking: CryptoRanking | null }) {
  const { t } = useI18n();
  const [seen, setSeen] = useState(() => storage.get(RANKING_INTRO_KEY) === '1');
  if (!ranking || seen) return null;
  const dismiss = () => {
    storage.set(RANKING_INTRO_KEY, '1');
    setSeen(true);
  };
  const change = () => {
    dismiss();
    const field = document.getElementById(ALIAS_FIELD_ID);
    field?.scrollIntoView?.({ block: 'center' });
    field?.focus({ preventScroll: true });
  };
  return (
    <aside className="cc-ranking-intro" aria-labelledby="cc-ranking-intro-title">
      <h2 id="cc-ranking-intro-title">
        <Icon name="star" />{' '}
        {t('app.crypto.ranking.intro.title', { alias: ranking.settings.alias })}
      </h2>
      <p>{t('app.crypto.ranking.rules.minimums', { trades: ranking.rules.minTrades })}</p>
      <p>{t('app.crypto.ranking.aliasNotice')}</p>
      <div className="cc-ranking-intro-actions">
        <button type="button" className="cc-save" onClick={change}>
          {t('app.crypto.ranking.intro.change')}
        </button>
        <button type="button" className="btn-secondary" onClick={dismiss}>
          {t('app.crypto.ranking.intro.ok')}
        </button>
      </div>
    </aside>
  );
}

/** «Ranking of the month»: everybody is in, top 5 by return, prize and rules in plain words. */
export function RankingCard({ state }: { state: Ranking }) {
  const { t, locale } = useI18n();
  const { ranking, error } = state;
  // The console waits for the ranking: without one, it failed.
  if (!ranking) {
    return (
      <section className="card cc-ranking">
        <p className="error-banner" role="alert">
          {error}
        </p>
      </section>
    );
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
        <Icon name="gift" /> <span>{t('app.crypto.ranking.prize', { days: rules.prizeDays })}</span>
      </p>
      {ranking.top.length ? (
        <Podium rows={ranking.top} />
      ) : (
        <p className="cc-hint">{t('app.crypto.ranking.empty', { trades: rules.minTrades })}</p>
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
