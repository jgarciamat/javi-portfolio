import { useId, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { leftoverAt, parseDaily, sliderMax } from '@modules/finances/domain/endOfMonth';
import type { EndOfMonth, EndOfMonthPayment } from '@modules/finances/domain/types';
import type { DashboardTab } from '../navigation';

const STATUS_KEYS: Record<EndOfMonth['status'], string> = {
  ok: 'app.forecast.eom.status.ok',
  tight: 'app.forecast.eom.status.tight',
  short: 'app.forecast.eom.status.short',
};

/** Concept, date and amount of the payments behind the figures. */
function Payments({ title, items }: { title: string; items: EndOfMonthPayment[] }) {
  const { t } = useI18n();
  const { money, dayMonth } = useFormat();
  if (items.length === 0) return null;
  return (
    <div className="eom-payments">
      <h4>{title}</h4>
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('app.forecast.eom.col.concept')}</th>
            <th>{t('app.forecast.eom.col.date')}</th>
            <th>{t('app.forecast.eom.col.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p, i) => (
            <tr key={`${p.date}-${i}`}>
              <td>{p.description}</td>
              <td>{dayMonth(p.date)}</td>
              <td>{money(p.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The formula in plain words, with the user's own figures. */
function HowWeCount({ plan }: { plan: EndOfMonth }) {
  const { t } = useI18n();
  const { money, monthLabel } = useFormat();
  const perDay = (amount: number) => t('app.forecast.eom.perDay', { amount: money(amount) });
  return (
    <details className="eom-how">
      <summary>{t('app.forecast.eom.how.title')}</summary>
      <ul>
        <li>
          {t('app.forecast.eom.how.month', {
            amount: money(plan.monthVariable),
            days: plan.daysElapsed,
            daily: perDay(plan.monthDaily),
          })}
        </li>
        {plan.historyDaily === null ? (
          <li>{t('app.forecast.eom.how.paceMonthOnly', { pace: perDay(plan.pace) })}</li>
        ) : (
          <>
            <li>
              {t('app.forecast.eom.how.history', {
                count: plan.historyMonths,
                daily: perDay(plan.historyDaily),
              })}
            </li>
            <li>
              {t('app.forecast.eom.how.pace', {
                month: money(plan.monthVariable),
                history: money(plan.historyDaily),
                days: plan.daysElapsed,
                pace: perDay(plan.pace),
              })}
            </li>
          </>
        )}
        <li>
          {t('app.forecast.eom.how.end', {
            available: money(plan.available),
            pending: money(plan.pendingTotal),
            pace: money(plan.pace),
            days: plan.daysLeft,
            result: money(plan.projectedEnd),
          })}
        </li>
        <li>
          {t('app.forecast.eom.how.max', {
            available: money(plan.available),
            pending: money(plan.pendingTotal),
            days: plan.daysLeft,
            result: perDay(plan.maxDaily),
          })}
        </li>
        <li>{t('app.forecast.eom.how.excluded')}</li>
        {plan.outlierMonths.length > 0 && (
          <li>
            {t('app.forecast.eom.how.outliers', {
              months: plan.outlierMonths.map((m) => monthLabel(m.year, m.month)).join(', '),
            })}
          </li>
        )}
      </ul>
      {plan.pending.length === 0 && (
        <p className="section-hint">{t('app.forecast.eom.how.pendingNone')}</p>
      )}
      <Payments title={t('app.forecast.eom.how.pendingTitle')} items={plan.pending} />
      <Payments title={t('app.forecast.eom.how.scheduledTitle')} items={plan.scheduled} />
      <Payments title={t('app.forecast.eom.how.oneOffsTitle')} items={plan.oneOffs} />
    </details>
  );
}

/** «Si gastas ___ al día» → what would be left, or missing, at the end of the month. */
function WhatIfDaily({ plan }: { plan: EndOfMonth }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const id = useId();
  const [text, setText] = useState(String(plan.pace));
  const daily = parseDaily(text) ?? plan.pace;
  const max = sliderMax(plan);
  const left = leftoverAt(plan, daily);
  return (
    <div className="eom-whatif">
      <label htmlFor={`${id}-amount`} className="eom-whatif-label">
        {t('app.forecast.eom.whatIf.label')}
      </label>
      <div className="eom-whatif-controls">
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={Math.min(daily, max)}
          aria-label={t('app.forecast.eom.whatIf.slider')}
          aria-valuetext={t('app.forecast.eom.perDay', { amount: money(daily) })}
          onChange={(e) => setText(e.target.value)}
        />
        <input
          id={`${id}-amount`}
          className="tx-input eom-whatif-amount"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <p className={`eom-whatif-result eom-tone--${left >= 0 ? 'ok' : 'short'}`} aria-live="polite">
        {left >= 0
          ? t('app.forecast.eom.whatIf.left', { amount: money(left) })
          : t('app.forecast.eom.whatIf.missing', { amount: money(-left) })}
      </p>
      {daily !== plan.pace && (
        <button type="button" className="btn-link" onClick={() => setText(String(plan.pace))}>
          {t('app.forecast.eom.whatIf.reset')}
        </button>
      )}
    </div>
  );
}

/** Two ways to learn about what could be done with what is left; never advice to buy. */
function Surplus({ onOpenTab }: { onOpenTab?: (tab: DashboardTab) => void }) {
  const { t } = useI18n();
  const links: { tab: DashboardTab; key: string; icon: string }[] = [
    { tab: 'invest', key: 'app.forecast.eom.surplus.invest', icon: 'coins' },
    { tab: 'crypto', key: 'app.forecast.eom.surplus.crypto', icon: 'candles' },
  ];
  return (
    <div className="eom-surplus">
      <h4>{t('app.forecast.eom.surplus.title')}</h4>
      <p className="section-hint">{t('app.forecast.eom.surplus.body')}</p>
      <div className="eom-surplus-links">
        {links.map((l) =>
          onOpenTab ? (
            <button
              key={l.tab}
              type="button"
              className="btn-secondary"
              onClick={() => onOpenTab(l.tab)}
            >
              <Icon name={l.icon} /> {t(l.key)}
            </button>
          ) : (
            <a key={l.tab} className="btn-secondary" href={`/?tab=${l.tab}`}>
              <Icon name={l.icon} /> {t(l.key)}
            </a>
          )
        )}
      </div>
    </div>
  );
}

/**
 * «¿Llegas a fin de mes?»: how the month would end at the usual pace, the most that can be spent
 * a day, a «what if I spend…» control, how it is worked out and what could be done with the rest.
 */
export function EndOfMonthBlock({
  plan,
  onOpenTab,
}: {
  plan: EndOfMonth;
  onOpenTab?: (tab: DashboardTab) => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  if (!plan.enoughData) {
    return (
      <div className="eom eom--empty">
        <p className="section-hint">
          <Icon name="sparkles" /> {t('app.forecast.eom.notEnough')}
        </p>
      </div>
    );
  }
  const perDay = (amount: number) => t('app.forecast.eom.perDay', { amount: money(amount) });
  return (
    <div className={`eom eom--${plan.status}`}>
      <p className="eom-kicker">{t('app.forecast.eom.kicker')}</p>
      <p className={`eom-figure eom-tone--${plan.status}`}>{money(plan.projectedEnd)}</p>
      <p className="eom-status">{t(STATUS_KEYS[plan.status])}</p>
      <p className="eom-max">
        {plan.maxDaily > 0 ? (
          <>
            {t('app.forecast.eom.maxDaily')} <strong>{perDay(plan.maxDaily)}</strong>
          </>
        ) : (
          t('app.forecast.noneLeft')
        )}
      </p>
      <dl className="eom-facts">
        <div>
          <dt>{t('app.forecast.eom.fact.available')}</dt>
          <dd>{money(plan.available)}</dd>
        </div>
        <div>
          <dt>{t('app.forecast.eom.fact.pending')}</dt>
          <dd>{money(plan.pendingTotal)}</dd>
        </div>
        <div>
          <dt>{t('app.forecast.eom.fact.daysLeft')}</dt>
          <dd>{t('app.forecast.eom.fact.daysValue', { count: plan.daysLeft })}</dd>
        </div>
        <div>
          <dt>{t('app.forecast.eom.fact.pace')}</dt>
          <dd>{perDay(plan.pace)}</dd>
        </div>
      </dl>
      {plan.fewData && <p className="eom-few section-hint">{t('app.forecast.eom.fewData')}</p>}
      <WhatIfDaily key={`${plan.pace}-${plan.available}`} plan={plan} />
      <HowWeCount plan={plan} />
      <Surplus onOpenTab={onOpenTab} />
      <p className="eom-disclaimer">{t('app.forecast.eom.disclaimer')}</p>
    </div>
  );
}
