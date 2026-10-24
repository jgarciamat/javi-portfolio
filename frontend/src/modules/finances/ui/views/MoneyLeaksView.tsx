import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { track } from '@core/analytics';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { useOnlineStatus } from '@shared/hooks/useOnlineStatus';
import { useResource } from '@shared/hooks/useResource';
import { errorMessage } from '@shared/utils/errors';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import type {
  LeakDecision,
  LeakFinding,
  LeakKind,
  MoneyLeaks,
} from '@modules/finances/domain/types';
import type { DashboardTab } from '../navigation';
import { ExportButtons } from '../components/ExportButtons';
import { LEAK_ICONS, LeakCard } from '../components/LeakCard';
import '../css/Sections.css';
import '../css/MoneyLeaks.css';

const KINDS: LeakKind[] = ['recurring', 'increase', 'duplicate', 'small'];
/** Days of movements for the full analysis (docs C.9). */
const FULL_DAYS = 90;
/** The «Done. Undo» notice stays this long (it can also be reached with the keyboard). */
export const UNDO_MS = 8000;

/** While it loads: the silhouette of the screen in thin blue outlines, without any figure. */
function LeaksSkeleton() {
  const { t } = useI18n();
  const bar = (w: string, big = false) => (
    <span
      className={`leaks-skel-bar${big ? ' leaks-skel-bar--big' : ''}`}
      style={{ '--w': w } as CSSProperties}
    />
  );
  return (
    <div className="leaks leaks-skel" role="status" aria-busy="true">
      <span className="sr-only">{t('app.leaks.loading')}</span>
      <div className="leaks-side" aria-hidden="true">
        <div className="card">
          {bar('8rem')}
          {bar('14rem', true)}
          {bar('11rem')}
        </div>
      </div>
      <div className="leaks-main" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="leak-card">
            {bar('9rem')}
            {bar('85%')}
            {bar('60%')}
            <div className="leaks-skel-row">
              <span className="leaks-skel-box" />
              <span className="leaks-skel-box" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function plural(
  t: (key: string, vars?: Record<string, string | number>) => string,
  key: string,
  count: number
) {
  return t(count === 1 ? `${key}One` : `${key}Other`, { count });
}

/** The figure, what it is made of and the filters. */
function Hero({
  data,
  filter,
  onFilter,
}: {
  data: MoneyLeaks;
  filter: LeakKind | 'all';
  onFilter: (kind: LeakKind | 'all') => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const euros = (amount: number) => money(Math.floor(amount), { decimals: false });
  const { total } = data;
  const kinds = KINDS.filter((k) => data.byKind[k].count > 0);
  return (
    <section
      className="card leaks-hero"
      aria-label={
        total.count > 0 ? t('app.leaks.headline', { amount: euros(total.annual) }) : undefined
      }
    >
      {total.count > 0 ? (
        <>
          <p className="leaks-hero-lead">{t('app.leaks.headlineLead')}</p>
          <p className="leaks-figure">
            {t('app.leaks.headlineFigure', { amount: euros(total.annual) })}
          </p>
          <p className="leaks-count">{plural(t, 'app.leaks.count', total.count)}</p>
          {total.oneOff > 0 && (
            <p className="leaks-oneoff">{t('app.leaks.oneOff', { amount: euros(total.oneOff) })}</p>
          )}
        </>
      ) : total.oneOff > 0 ? (
        <p className="leaks-count leak-strong">
          {t('app.leaks.oneOffOnly', { amount: euros(total.oneOff) })}
        </p>
      ) : (
        <p className="leaks-count">{t('app.leaks.empty')}</p>
      )}
      {kinds.length > 1 && (
        <div className="leaks-chips" role="group" aria-label={t('app.leaks.filter')}>
          <button
            type="button"
            className="leaks-chip"
            aria-pressed={filter === 'all'}
            onClick={() => onFilter('all')}
          >
            {t('app.leaks.all')} <span className="leaks-chip-count">{data.count}</span>
          </button>
          {kinds.map((kind) => (
            <button
              key={kind}
              type="button"
              className="leaks-chip"
              aria-pressed={filter === kind}
              onClick={() => onFilter(kind)}
            >
              <Icon name={LEAK_ICONS[kind]} /> {t(`app.leaks.kind.${kind}`)}{' '}
              <span className="leaks-chip-count">{data.byKind[kind].count}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** The findings still to check that this plan shows, as CSV or PDF. */
function LeaksExport({ findings }: { findings: LeakFinding[] }) {
  const { t } = useI18n();
  const { currency } = useFormat();
  const unit = (key: string) => `${t(key)} (${currency})`;
  return (
    <ExportButtons
      name="dinero-perdido"
      what={t('app.leaks.exportWhat')}
      count={findings.length}
      pdf
      table={() => ({
        head: [
          t('app.leaks.col.label'),
          t('app.leaks.col.kind'),
          t('app.leaks.col.cadence'),
          unit('app.leaks.col.amount'),
          unit('app.leaks.col.annual'),
          unit('app.leaks.col.oneOff'),
          t('app.leaks.col.last'),
        ],
        rows: findings.map((f) => [
          f.label,
          t(`app.leaks.tag.${f.kind}`),
          f.cadence ? t(`app.leaks.cadence.${f.cadence}`) : '',
          f.amount,
          f.annual,
          f.oneOff,
          f.lastDate,
        ]),
      })}
    />
  );
}

/** Too few movements yet: what is missing and the button to import. */
function Coverage({ data, onImport }: { data: MoneyLeaks; onImport: () => void }) {
  const { t } = useI18n();
  const { level, days, yearlyReady } = data.coverage;
  if (level === 'complete') {
    return yearlyReady ? null : <p className="section-hint">{t('app.leaks.yearlyNote')}</p>;
  }
  const shown = Math.min(days, FULL_DAYS);
  return (
    <section className="card">
      <p className="leak-line">{t('app.leaks.partial', { days: shown })}</p>
      <div
        className="leaks-progress"
        role="progressbar"
        aria-label={t('app.leaks.partialLabel')}
        aria-valuemin={0}
        aria-valuemax={FULL_DAYS}
        aria-valuenow={shown}
      >
        <span style={{ width: `${(shown / FULL_DAYS) * 100}%` }} />
      </div>
      <p className="section-hint">{t('app.leaks.importTip')}</p>
      <button
        type="button"
        className="leak-btn leak-btn--primary"
        onClick={() => {
          track('dp_import_cta', { detail: 'partial' });
          onImport();
        }}
      >
        {t('app.leaks.none.cta')}
      </button>
    </section>
  );
}

/** No movements at all: what we look for and how to bring the bank statement. */
function NoMovements({
  onImport,
  onOpenTab,
}: {
  onImport: () => void;
  onOpenTab: (tab: DashboardTab) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="card leaks-none">
      <p className="leaks-empty-icon" aria-hidden="true">
        🔍
      </p>
      <h2 className="section-title">{t('app.leaks.none.title')}</h2>
      <p className="leak-line">{t('app.leaks.none.body')}</p>
      <button
        type="button"
        className="leak-btn leak-btn--primary"
        onClick={() => {
          track('dp_import_cta', { detail: 'none' });
          onImport();
        }}
      >
        {t('app.leaks.none.cta')}
      </button>
      <p className="section-hint">{t('app.leaks.importTip')}</p>
      <button type="button" className="leak-link" onClick={() => onOpenTab('videos')}>
        {t('app.leaks.none.howTo')}
      </button>
    </section>
  );
}

/** What the user already decided: they can change their mind from here. */
function Reviewed({
  data,
  list,
  disabled,
  onAction,
}: {
  data: MoneyLeaks;
  list: LeakFinding[];
  disabled: boolean;
  onAction: (finding: LeakFinding, status: LeakDecision | null) => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const [open, setOpen] = useState(false);
  const { cancelMonthly, recoveredAnnual } = data.reviewed;
  if (list.length === 0) return null;
  return (
    <section className="card" aria-label={t('app.leaks.reviewed', { count: list.length })}>
      <button
        type="button"
        className="leak-btn leaks-reviewed-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{t('app.leaks.reviewed', { count: list.length })}</span>
        <span aria-hidden="true">{open ? '▴' : '▸'}</span>
      </button>
      {cancelMonthly > 0 && (
        <p className="leaks-saving">
          {t('app.leaks.toCancel', {
            amount: money(Math.floor(cancelMonthly), { decimals: false }),
          })}
        </p>
      )}
      {recoveredAnnual > 0 && (
        <p className="leaks-saving">
          {t('app.leaks.recoveredTotal', {
            amount: money(Math.floor(recoveredAnnual), { decimals: false }),
          })}
        </p>
      )}
      {open && (
        <ul className="leaks-list">
          {list.map((f) => (
            <li key={f.id}>
              <LeakCard
                finding={f}
                disabled={disabled}
                onAction={(status) => onAction(f, status)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** «We couldn't check your movements» with «Try again». */
function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <section className="card" role="alert">
      <p className="leak-line">{message}</p>
      <button type="button" className="leak-btn" onClick={onRetry}>
        {t('app.leaks.retry')}
      </button>
    </section>
  );
}

/** Free plan: how many more findings there are, and the plans. */
function Locked({ hidden }: { hidden: number }) {
  const { t } = useI18n();
  const plan = useOptionalPlan();
  return (
    <section className="card leaks-locked">
      <p className="leak-line">
        <Icon name="lock" /> {plural(t, 'app.leaks.locked', hidden)}{' '}
        <span className="premium-chip">Premium</span>
      </p>
      {plan && (
        <button
          type="button"
          className="leak-btn leak-btn--primary"
          onClick={() => plan.openUpgrade({ kind: 'feature', feature: 'insights', from: 'dp' })}
        >
          {t('billing.seePlans')}
        </button>
      )}
    </section>
  );
}

interface Undo {
  finding: LeakFinding;
  status: LeakDecision;
}

/** «Done. Undo» for 8 seconds, with the help a decision needs (how to cancel, call the bank). */
function UndoNotice({
  undo,
  disabled,
  onUndo,
}: {
  undo: Undo | null;
  disabled: boolean;
  onUndo: (finding: LeakFinding) => void;
}) {
  const { t } = useI18n();
  return (
    <div aria-live="polite" className="leaks-live">
      {undo && (
        <div className="leaks-toast">
          <p>
            {t('app.leaks.done')}{' '}
            {undo.status === 'cancel' &&
              undo.finding.kind === 'recurring' &&
              t('app.leaks.cancel.help')}
            {undo.status === 'not_mine' && t('app.leaks.notMine.help')}
          </p>
          <button
            type="button"
            className="leak-btn"
            disabled={disabled}
            onClick={() => onUndo(undo.finding)}
          >
            {t('app.leaks.undoButton')}
          </button>
        </div>
      )}
    </div>
  );
}

/** Decisions and «undo»: each one saved on the server, then the figures read again. */
function useLeakDecisions(reload: () => Promise<void>) {
  const { insightsApi } = useApi();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);

  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [undo]);

  const change = async (run: () => Promise<unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await run();
      await reload();
    } catch (e) {
      setError(errorMessage(e, t('app.leaks.error')));
    } finally {
      setSaving(false);
    }
  };
  const revert = (finding: LeakFinding) =>
    void change(async () => {
      await insightsApi.undoLeak(finding.id);
      setUndo(null);
    });
  const act = (finding: LeakFinding, status: LeakDecision | null) => {
    if (!status) return revert(finding);
    void change(async () => {
      await insightsApi.decideLeak(finding.id, status);
      setUndo({ finding, status });
    });
  };
  return { saving, error, clearError: () => setError(null), undo, act, revert };
}

/**
 * «Tu dinero perdido»: what the user's movements show that is worth checking (charges that
 * repeat, price rises, possible double charges and small purchases made very often), what it
 * costs a year and what the user decided. Computed on the server, without AI; the app never
 * knows whether a service is used, so it asks and never states. The free plan sees the figure,
 * the most expensive findings and every possible double charge.
 */
export function MoneyLeaksView({
  onImport,
  onOpenTab,
}: {
  onImport: () => void;
  onOpenTab: (tab: DashboardTab) => void;
}) {
  const { insightsApi } = useApi();
  const { t } = useI18n();
  const online = useOnlineStatus();
  const leaks = useResource(() => insightsApi.moneyLeaks(), [insightsApi]);
  const decisions = useLeakDecisions(leaks.reload);
  const [filter, setFilter] = useState<LeakKind | 'all'>('all');
  const data = leaks.data;

  // Seen once per opening, by how much there is to look at.
  const level = data?.coverage.level;
  const counted = useRef(false);
  useEffect(() => {
    if (!level || counted.current) return;
    counted.current = true;
    track('dp_view', { detail: level });
  }, [level]);

  const retry = () => {
    decisions.clearError();
    void leaks.reload();
  };
  if (!data) {
    return leaks.error ? (
      <div className="section-view">
        <ErrorCard message={t('app.leaks.error')} onRetry={retry} />
      </div>
    ) : (
      <LeaksSkeleton />
    );
  }

  const pending = data.findings.filter((f) => f.status === 'new');
  const reviewed = data.findings.filter((f) => f.status !== 'new');
  const shown = pending.filter((f) => filter === 'all' || f.kind === filter);
  const hidden = data.count - pending.length;
  const disabled = !online || decisions.saving;
  const failed = decisions.error ?? (leaks.error ? t('app.leaks.error') : null);

  return (
    <div className="section-view">
      <h2 className="section-title">
        <Icon name="coins" /> {t('app.leaks.title')}
      </h2>
      <p className="section-hint">{t('app.leaks.hint')}</p>
      {data.coverage.level === 'none' ? (
        <NoMovements onImport={onImport} onOpenTab={onOpenTab} />
      ) : (
        <div className="leaks">
          <div className="leaks-side">
            <Hero data={data} filter={filter} onFilter={setFilter} />
            <LeaksExport findings={pending} />
            <Reviewed data={data} list={reviewed} disabled={disabled} onAction={decisions.act} />
          </div>
          <div className="leaks-main">
            {failed && <ErrorCard message={failed} onRetry={retry} />}
            {!online && <p className="section-hint">{t('app.leaks.offline')}</p>}
            <Coverage data={data} onImport={onImport} />
            {shown.length > 0 && (
              <ul className="leaks-list">
                {shown.map((f) => (
                  <li key={f.id}>
                    <LeakCard
                      finding={f}
                      disabled={disabled}
                      onAction={(status) => decisions.act(f, status)}
                    />
                  </li>
                ))}
              </ul>
            )}
            {data.locked && hidden > 0 && <Locked hidden={hidden} />}
            <p className="leaks-disclaimer">
              <Icon name="alert" /> {t('app.leaks.disclaimer')}
            </p>
          </div>
        </div>
      )}
      <UndoNotice undo={decisions.undo} disabled={disabled} onUndo={decisions.revert} />
    </div>
  );
}
