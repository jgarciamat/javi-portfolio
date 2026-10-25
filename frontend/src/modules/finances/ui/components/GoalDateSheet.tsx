import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { track } from '@core/analytics';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { Modal } from '@shared/components/Modal';
import { parseDecimal } from '@shared/utils/numbers';
import type { Goal } from '@modules/finances/domain/types';
import {
  goalDate,
  monthsBetween,
  targetMonth,
  type GoalDate,
  type YearMonth,
} from '../../domain/goalDate';
import '../css/GoalDate.css';
import type { DashboardTab } from '../navigation';

/** Steps of the slider and of its −10 / +10 buttons. */
const STEP = 10;
const CHIPS = [25, 50, 100];

/** What «Tu dinero perdido» adds to the simulator: only what the user decided to cancel. */
export interface LeaksForGoal {
  /** €/month the user decided to cancel (or is no longer charged). */
  decidedMonthly: number;
  /** €/month still to check (only a hint, never added). */
  pendingMonthly: number;
}

/** «febrero de 2028», or the sentence that replaces a date that cannot be given. */
export function useGoalDateText() {
  const { t } = useI18n();
  const { monthYear } = useFormat();
  return (result: GoalDate): string => {
    if (result.kind === 'date') return monthYear(result.year, result.month);
    if (result.kind === 'zero') return t('app.goals.date.zero');
    if (result.kind === 'tooLong') return t('app.goals.date.tooLong');
    return t('app.goals.completed');
  };
}

/** A number with its unit inside the same box («120 €», «4 %»). */
function UnitInput({
  id,
  value,
  unit,
  onChange,
  ...rest
}: {
  id: string;
  value: string;
  unit: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <span className="goal-unit-input">
      <input
        id={id}
        className="tx-input"
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      <span className="goal-unit" aria-hidden="true">
        {unit}
      </span>
    </span>
  );
}

/** −10, the slider and +10, then the quick +25 / +50 / +100. */
function ExtraControls({
  extra,
  max,
  onChange,
}: {
  extra: number;
  max: number;
  onChange: (how: 'chip' | 'slider', value: number) => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const id = useId();
  const whole = (amount: number) => money(amount, { decimals: false });
  const extraText = t('app.goals.date.extra', { amount: whole(Math.round(extra)) });
  return (
    <div className="goal-sheet-group">
      <label className="goal-sheet-label goal-extra-label" htmlFor={id}>
        <span>{t('app.goals.date.extraLabel')}:</span> <strong>{extraText}</strong>
      </label>
      <div className="goal-sheet-slider">
        <button
          type="button"
          className="goal-step"
          aria-label={t('app.goals.date.minus', { amount: whole(STEP) })}
          onClick={() => onChange('slider', extra - STEP)}
        >
          −10
        </button>
        <input
          id={id}
          type="range"
          min={0}
          max={max}
          step={STEP}
          value={Math.min(extra, max)}
          aria-valuetext={extraText}
          onChange={(e) => onChange('slider', Number(e.target.value))}
        />
        <button
          type="button"
          className="goal-step"
          aria-label={t('app.goals.date.plus', { amount: whole(STEP) })}
          onClick={() => onChange('slider', extra + STEP)}
        >
          +10
        </button>
      </div>
      <div className="goal-sheet-chips">
        {CHIPS.map((amount) => (
          <button
            key={amount}
            type="button"
            className="goal-chip"
            aria-pressed={extra === amount}
            onClick={() => onChange('chip', amount)}
          >
            +{whole(amount)}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * «Use what you're cancelling»: only the amount the user decided to cancel in «Tu dinero
 * perdido» is added; what is still to check is only a hint with the way there.
 */
function LeaksOffer({
  leaks,
  onApply,
  onOpenTab,
}: {
  leaks: LeaksForGoal | null;
  onApply: (amount: number) => void;
  onOpenTab: (tab: DashboardTab) => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  if (!leaks) return null;
  if (leaks.decidedMonthly > 0) {
    return (
      <button
        type="button"
        className="goal-sheet-leaks"
        onClick={() => {
          track('goal_dp_apply');
          onApply(leaks.decidedMonthly);
        }}
      >
        <Icon name="coins" />
        {t('app.goals.date.useLeaks', { amount: money(leaks.decidedMonthly) })}
      </button>
    );
  }
  if (leaks.pendingMonthly <= 0) return null;
  return (
    <p className="goal-sheet-note">
      {t('app.goals.date.leaksHint', {
        amount: money(Math.floor(leaks.pendingMonthly), { decimals: false }),
      })}{' '}
      <button type="button" className="goal-inline-link" onClick={() => onOpenTab('leaks')}>
        {t('app.leaks.analysisCta')}
      </button>
    </p>
  );
}

/** «Add an estimated return»: 0 to 10 % a year, with the warning of the public calculator. */
function RateField({ rate, onChange }: { rate: string; onChange: (rate: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const id = useId();
  const inputId = useId();
  return (
    <div className="goal-sheet-rate">
      <button
        type="button"
        className="goal-sheet-more"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} />
        {t('app.goals.date.rate')}
      </button>
      {open && (
        <div id={id} className="goal-sheet-group">
          <label className="goal-sheet-label" htmlFor={inputId}>
            {t('app.goals.date.rateLabel')}
          </label>
          <UnitInput
            id={inputId}
            unit="%"
            min="0"
            max="10"
            step="0.5"
            value={rate}
            onChange={onChange}
          />
          <p className="goal-sheet-note">{t('tools.goal.disclaimer')}</p>
        </div>
      )}
    </div>
  );
}

/** The answer, read out politely: the month and how much sooner than at the first pace. */
function SheetResult({
  before,
  after,
  extra,
}: {
  before: GoalDate;
  after: GoalDate;
  extra: number;
}) {
  const { t } = useI18n();
  const { money, monthYear } = useFormat();
  const dateText = useGoalDateText();
  const sooner = before.kind === 'date' && after.kind === 'date' ? monthsBetween(after, before) : 0;
  const result =
    after.kind === 'date'
      ? t('app.goals.date.result', { date: monthYear(after.year, after.month) })
      : dateText(after);
  const extraText = t('app.goals.date.extra', {
    amount: money(Math.round(extra), { decimals: false }),
  });
  // «Llegarías en» small and the month big, from the same sentence.
  const [lead, tail] = t('app.goals.date.result').split('{date}');
  return (
    <div className="goal-sheet-result" aria-live="polite" aria-atomic="true">
      {after.kind === 'date' ? (
        <p className="goal-result-line" aria-hidden="true">
          {lead}
          <strong className="goal-result-date">{monthYear(after.year, after.month)}</strong>
          {tail}
        </p>
      ) : (
        <p className="goal-result-line" aria-hidden="true">
          {result}
        </p>
      )}
      {sooner > 0 && (
        <p className="goal-result-gain">
          <Icon name="trend" size={16} />
          {t(sooner === 1 ? 'app.goals.date.soonerOne' : 'app.goals.date.soonerOther', {
            count: sooner,
          })}
        </p>
      )}
      <p className="sr-only">
        {after.kind === 'date'
          ? t('app.goals.date.spoken', {
              extra: extraText,
              date: monthYear(after.year, after.month),
            })
          : result}
      </p>
    </div>
  );
}

/**
 * «What if you put aside more each month?»: the same goal with a monthly amount the user can
 * change by typing, with the slider, with −10 / +10 (easier than dragging for older hands) or
 * with quick +25 / +50 / +100. The answer changes at once and is read out politely. Nothing is
 * saved. An estimated yearly return is optional, with the warning of the public calculator.
 */
export function GoalDateSheet({
  goal,
  pace,
  current,
  leaks,
  onClose,
  onOpenTab,
}: {
  goal: Goal;
  /** The real pace, or what the user said they put aside. */
  pace: number;
  current: YearMonth;
  leaks: LeaksForGoal | null;
  onClose: () => void;
  onOpenTab: (tab: DashboardTab) => void;
}) {
  const { t } = useI18n();
  const [base, setBase] = useState(String(pace));
  const [extra, setExtra] = useState(0);
  const [rate, setRate] = useState('');
  const changed = useRef(false);
  const baseId = useId();

  const monthly = parseDecimal(base) || 0;
  const annualRatePct = Math.min(10, Math.max(0, parseDecimal(rate) || 0));
  const at = (amount: number) =>
    goalDate({
      target: goal.target,
      saved: goal.progress.saved,
      monthly: amount,
      annualRatePct,
      current,
      savedThisMonth: goal.progress.savedThisMonth,
    });

  /** The first change of each opening is counted, by how it was made. */
  const count = (how: 'chip' | 'slider' | 'input') => {
    if (changed.current) return;
    changed.current = true;
    track('goal_sim_change', { detail: how });
  };
  const change = (how: 'chip' | 'slider', value: number) => {
    count(how);
    setExtra(Math.max(0, value));
  };

  // On <body>, so that it covers the header too and sits at the bottom of a phone.
  return createPortal(
    <Modal
      label={t('app.goals.date.sheetTitle')}
      onClose={onClose}
      className="modal-panel goal-sheet"
    >
      <div className="goal-sheet-head">
        <h2 className="goal-sheet-title">{t('app.goals.date.sheetTitle')}</h2>
        <button
          type="button"
          className="icon-btn goal-sheet-close"
          onClick={onClose}
          aria-label={t('app.common.close')}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="goal-sheet-body">
        <p className="goal-pill" title={goal.name}>
          <span className="goal-pill-icon" aria-hidden="true">
            {goal.icon}
          </span>
          <span className="goal-pill-name">{goal.name}</span>
        </p>
        <div className="goal-sheet-group">
          <label className="goal-sheet-label" htmlFor={baseId}>
            {t('app.goals.date.monthly')}
          </label>
          <UnitInput
            id={baseId}
            unit="€"
            min="0"
            step="1"
            value={base}
            onChange={(value) => {
              count('input');
              setBase(value);
            }}
          />
        </div>
        <ExtraControls
          extra={extra}
          max={Math.max(300, Math.ceil((2 * monthly) / STEP) * STEP)}
          onChange={change}
        />
        <LeaksOffer
          leaks={leaks}
          onApply={(amount) => change('chip', amount)}
          onOpenTab={onOpenTab}
        />
        {/* «N months sooner» than at the pace the sheet opened with. */}
        <SheetResult before={at(pace)} after={at(monthly + extra)} extra={extra} />
        <RateField rate={rate} onChange={setRate} />
      </div>
      <p className="goal-sheet-legal">{t('app.goals.date.disclaimer')}</p>
    </Modal>,
    document.body
  );
}

/** «Tell us how much you plan to put aside…»: the goal has no saving pace yet. */
function AskPace({ onAnswer }: { onAnswer: (monthly: number) => void }) {
  const { t } = useI18n();
  const [typed, setTyped] = useState('');
  const id = useId();
  return (
    <form
      className="goal-date"
      data-tour="goal-date"
      onSubmit={(e) => {
        e.preventDefault();
        onAnswer(parseDecimal(typed) || 0);
      }}
    >
      <label className="goal-date-lead" htmlFor={id}>
        {t('app.goals.date.askPace')}
      </label>
      <div className="goal-sheet-row">
        <UnitInput id={id} unit="€" min="0" step="1" value={typed} onChange={setTyped} />
        <button type="submit" className="goal-date-btn">
          {t('app.goals.date.calc')}
        </button>
      </div>
    </form>
  );
}

/** How early or late against the goal's own date, and what it would take to make it. */
function TargetGap({ goal, result }: { goal: Goal; result: GoalDate }) {
  const { t } = useI18n();
  const { money, monthYear } = useFormat();
  if (!goal.targetDate || result.kind !== 'date') return null;
  const deadline = targetMonth(goal.targetDate);
  const gap = monthsBetween(deadline, result);
  if (gap === 0) return <p className="goal-date-gap">{t('app.goals.date.onTime')}</p>;
  if (gap < 0) {
    return (
      <p className="goal-date-gap goal-date-gap--good">
        {t(gap === -1 ? 'app.goals.date.earlyOne' : 'app.goals.date.early', { count: -gap })}
      </p>
    );
  }
  return (
    <p className="goal-date-gap goal-date-gap--late">
      {t(gap === 1 ? 'app.goals.date.lateOne' : 'app.goals.date.late', {
        date: monthYear(deadline.year, deadline.month),
        count: gap,
        amount: money(Math.round(goal.progress.monthlyNeeded as number), { decimals: false }),
      })}
    </p>
  );
}

/**
 * «At your pace (120 €/month) you get there in February 2028» under a goal: the real pace of its
 * category (server), or the amount the user says when there is none yet. With a target date it
 * also says how early or late, and what it would take to make it.
 */
export function GoalDateLine({
  goal,
  current,
  leaks,
  onOpenTab,
}: {
  goal: Goal;
  current: YearMonth;
  leaks: LeaksForGoal | null;
  onOpenTab: (tab: DashboardTab) => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const dateText = useGoalDateText();
  const [asked, setAsked] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const { averageMonthly, historyMonths } = goal.progress;
  const monthly = averageMonthly ?? asked;
  if (monthly === null) return <AskPace onAnswer={setAsked} />;

  const amount = money(Math.round(monthly), { decimals: false });
  const result = goalDate({
    target: goal.target,
    saved: goal.progress.saved,
    monthly,
    current,
    savedThisMonth: goal.progress.savedThisMonth,
  });
  return (
    <div className="goal-date" data-tour="goal-date">
      <p className="goal-date-lead">
        {averageMonthly !== null
          ? t('app.goals.date.atPace', { amount })
          : t('app.goals.date.atAmount', { amount })}
      </p>
      <p className="goal-date-big">{dateText(result)}</p>
      {averageMonthly !== null && historyMonths < 4 && (
        <p className="goal-date-gap goal-date-muted">
          {t('app.goals.date.fewMonths', { count: historyMonths })}
        </p>
      )}
      <TargetGap goal={goal} result={result} />
      <div className="goal-date-actions">
        <button type="button" className="goal-date-btn" onClick={() => setOpen(true)}>
          {t('app.goals.date.whatIf')}
          <Icon name="chevronRight" size={16} />
        </button>
        {averageMonthly === null && (
          <button type="button" className="goal-sheet-more" onClick={() => setAsked(null)}>
            {t('app.goals.date.change')}
          </button>
        )}
      </div>
      {open && (
        <GoalDateSheet
          goal={goal}
          pace={monthly}
          current={current}
          leaks={leaks}
          onClose={() => setOpen(false)}
          onOpenTab={onOpenTab}
        />
      )}
    </div>
  );
}
