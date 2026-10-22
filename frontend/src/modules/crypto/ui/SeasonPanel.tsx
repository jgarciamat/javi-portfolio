import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { Modal } from '@shared/components/Modal';
import { storage } from '@shared/utils/storage';
import type { Simulator } from '../application/useSimulator';
import { formatChange } from '../domain/format';
import { BADGE_IDS, counted, lastSeason, monthLabel, monthName } from '../domain/season';
import type { SimPortfolio } from '../domain/types';
import { useMoney } from './money';
import { SeasonReportButtons } from './PremiumPanel';
import '@shared/components/css/ConfirmDeleteModal.css';
import './css/Season.css';

/** The season summed up last on this device (so it is shown once). */
export const SEEN_KEY = 'mm_crypto_season_seen';

function Confirm({
  title,
  body,
  confirm,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirm: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      label={title}
      onClose={onClose}
      overlayClassName="confirm-delete-overlay"
      className="confirm-delete-modal"
    >
      <h2 className="confirm-delete-title">{title}</h2>
      <p className="confirm-delete-message">{body}</p>
      <div className="confirm-delete-actions">
        <button type="button" className="btn-cancel" onClick={onClose} autoFocus>
          {t('app.common.cancel')}
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {confirm}
        </button>
      </div>
    </Modal>
  );
}

/** Which portfolio is on screen: the official season or a practice one, and a new practice. */
export function PortfolioBar({ portfolio, sim }: { portfolio: SimPortfolio; sim: Simulator }) {
  const { t, locale } = useI18n();
  const practices = portfolio.portfolios.filter((p) => p.kind === 'practice');
  const canCreate =
    practices.length < portfolio.plan.practiceMax && portfolio.plan.practiceActionsLeft > 0;
  let practiceNumber = 0;
  return (
    <nav className="cc-portfolios" aria-label={t('app.crypto.portfolios.label')}>
      {portfolio.portfolios.map((p) => {
        const label =
          p.kind === 'season'
            ? t('app.crypto.portfolios.season', { month: monthName(p.season!, locale) })
            : t('app.crypto.portfolios.practice', { n: ++practiceNumber });
        const on = p.id === portfolio.portfolio.id;
        return (
          <button
            key={p.id}
            type="button"
            className={`cc-chip cc-portfolio${on ? ' is-on' : ''}`}
            aria-pressed={on}
            disabled={sim.action.pending}
            onClick={() => void sim.select(p.id)}
          >
            <Icon name={p.kind === 'season' ? 'flag' : 'wrench'} /> {label}
          </button>
        );
      })}
      {canCreate && (
        <button
          type="button"
          className="cc-chip cc-portfolio-new"
          disabled={sim.action.pending}
          onClick={() => void sim.createPractice()}
        >
          <Icon name="plus" /> {t('app.crypto.portfolios.new')}
        </button>
      )}
    </nav>
  );
}

/** The official portfolio: the countdown, the warning of the last days and past seasons. */
function SeasonCard({ portfolio }: { portfolio: SimPortfolio }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const { season } = portfolio;
  const days = season.daysLeft;
  return (
    <section className="card cc-season" aria-labelledby="cc-season-title">
      <h2 id="cc-season-title" className="section-title">
        <Icon name="flag" />{' '}
        {t('app.crypto.season.title', { month: monthLabel(season.month, locale) })}
      </h2>
      <p className="cc-countdown" role="timer">
        {days === 0
          ? t('app.crypto.season.lastDay')
          : counted(t, 'app.crypto.season.countdown', days)}
      </p>
      {season.endingSoon && (
        <p className="cc-season-warning" role="status">
          <Icon name="clock" /> {t('app.crypto.season.warning')}
        </p>
      )}
      <p className="cc-hint">{t('app.crypto.season.rules')}</p>
      {season.history.length > 0 && (
        <details className="cc-history">
          <summary>{t('app.crypto.season.history')}</summary>
          <table className="cc-history-table">
            <thead>
              <tr>
                <th scope="col">{t('app.crypto.season.columns.month')}</th>
                <th scope="col">{t('app.crypto.season.columns.final')}</th>
                <th scope="col">{t('app.crypto.season.columns.percent')}</th>
                <th scope="col">{t('app.crypto.season.columns.trades')}</th>
                <th scope="col">{t('app.crypto.season.columns.place')}</th>
              </tr>
            </thead>
            <tbody>
              {season.history.map((r) => (
                <tr key={r.season}>
                  <th scope="row">{monthLabel(r.season, locale)}</th>
                  <td>{money.amount(r.final)}</td>
                  <td>{formatChange(r.percent, locale)}</td>
                  <td>{r.trades}</td>
                  <td>{r.place ? t('app.crypto.ranking.placeShort', { place: r.place }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      <SeasonReportButtons portfolio={portfolio} />
    </section>
  );
}

/** A practice portfolio: what it is for, and its own «Start again» and «Delete». */
function PracticeCard({ portfolio, sim }: { portfolio: SimPortfolio; sim: Simulator }) {
  const { t } = useI18n();
  const [asking, setAsking] = useState<'reset' | 'delete' | null>(null);
  const busy = sim.action.pending;
  return (
    <section className="card cc-season cc-practice" aria-labelledby="cc-practice-title">
      <h2 id="cc-practice-title" className="section-title">
        <Icon name="wrench" /> {t('app.crypto.practice.title')}
      </h2>
      <p>{t('app.crypto.practice.body')}</p>
      <p className="cc-hint">
        {counted(t, 'app.crypto.practice.left', portfolio.plan.practiceActionsLeft)}
      </p>
      <div className="cc-practice-actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={busy || portfolio.plan.practiceActionsLeft === 0}
          onClick={() => setAsking('reset')}
        >
          {t('app.crypto.practice.reset')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => setAsking('delete')}
        >
          {t('app.crypto.practice.delete')}
        </button>
      </div>
      {asking && (
        <Confirm
          title={t(`app.crypto.practice.${asking}Title`)}
          body={t(`app.crypto.practice.${asking}Body`)}
          confirm={t(`app.crypto.practice.${asking}Confirm`)}
          onClose={() => setAsking(null)}
          onConfirm={() => void (asking === 'reset' ? sim.resetPractice() : sim.deletePractice())}
        />
      )}
    </section>
  );
}

/** When a new season starts: how the last one went (once), and the prize if it was won. */
function LastSeason({ portfolio }: { portfolio: SimPortfolio }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const result = lastSeason(portfolio);
  const [seen, setSeen] = useState(() => storage.get(SEEN_KEY));
  if (!result || seen === result.season) return null;
  const month = monthName(result.season, locale);
  const close = () => {
    storage.set(SEEN_KEY, result.season);
    setSeen(result.season);
  };
  return (
    <section className="card cc-last-season" role="status" aria-labelledby="cc-last-title">
      <h2 id="cc-last-title" className="section-title">
        {t('app.crypto.lastSeason.title', { month })}
      </h2>
      {result.prizeDays > 0 && (
        <p className="cc-prize">
          <Icon name="gift" /> <b>{t('app.crypto.lastSeason.prize')}</b>{' '}
          {t('app.crypto.lastSeason.prizeBody')}
        </p>
      )}
      <p>
        {t('app.crypto.lastSeason.result', {
          amount: money.amount(result.final),
          percent: formatChange(result.percent, locale),
          trades: result.trades,
        })}
      </p>
      <p>
        {result.place
          ? t('app.crypto.lastSeason.place', { place: result.place })
          : result.ranked && !result.qualified
            ? t('app.crypto.lastSeason.notQualified')
            : t('app.crypto.lastSeason.notRanked')}
      </p>
      <p className="cc-hint">{t('app.crypto.lastSeason.fresh')}</p>
      <button type="button" className="btn-secondary" onClick={close}>
        {t('app.crypto.lastSeason.ok')}
      </button>
    </section>
  );
}

/** The season or practice card, with the summary of the month that ended. */
export function SeasonPanel({ portfolio, sim }: { portfolio: SimPortfolio; sim: Simulator }) {
  return (
    <>
      <LastSeason portfolio={portfolio} />
      <PortfolioBar portfolio={portfolio} sim={sim} />
      {portfolio.portfolio.kind === 'season' ? (
        <SeasonCard portfolio={portfolio} />
      ) : (
        <PracticeCard portfolio={portfolio} sim={sim} />
      )}
    </>
  );
}

/** The «no money left» offer of the official season: a practice portfolio until the 1st. */
export function PracticeOffer({ portfolio, sim }: { portfolio: SimPortfolio; sim: Simulator }) {
  const { t } = useI18n();
  const practice = portfolio.portfolios.find((p) => p.kind === 'practice');
  return (
    <span className="cc-practice-offer">
      {t('app.crypto.practice.offer')}{' '}
      <button
        type="button"
        className="btn-primary"
        disabled={sim.action.pending}
        onClick={() => void (practice ? sim.select(practice.id) : sim.createPractice())}
      >
        {t(practice ? 'app.crypto.practice.open' : 'app.crypto.practice.create')}
      </button>
    </span>
  );
}

/** Light badges: earned in colour, the rest in grey with what is missing. */
export function BadgesCard({ portfolio }: { portfolio: SimPortfolio }) {
  const { t } = useI18n();
  const earned = new Set(portfolio.badges.map((b) => b.id));
  const icons = {
    firstTrade: 'rocket',
    firstTakeProfit: 'target',
    tenTrades: 'star',
    positiveMonth: 'trend',
  } as const;
  return (
    <section className="card cc-badges" aria-labelledby="cc-badges-title">
      <h2 id="cc-badges-title" className="section-title">
        {t('app.crypto.badges.title')}
      </h2>
      <ul>
        {BADGE_IDS.map((id) => (
          <li key={id} className={earned.has(id) ? 'is-earned' : undefined}>
            <span className="cc-badge-icon" aria-hidden="true">
              <Icon name={icons[id]} />
            </span>
            <span>
              <b>{t(`app.crypto.badges.${id}.title`)}</b>
              <span className="cc-hint">
                {earned.has(id) ? t('app.crypto.badges.earned') : t(`app.crypto.badges.${id}.how`)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
