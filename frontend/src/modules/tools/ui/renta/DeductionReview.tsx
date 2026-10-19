import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { Deduction, IncomeLimit, RentaCcaa } from '../../domain/rentaData';
import { number, type Choice } from '../../domain/rentaForm';
import { needsAmount, queueOf, type Decision, type ReviewState } from '../../domain/rentaReview';
import type { DeductionSaving } from '../../domain/rentaSavings';
import { Step, reveal, useMoney } from './shared';

export interface ReviewProps {
  n: number;
  ccaa: RentaCcaa | null;
  /** The State's deductions and the community's, to find each one of the review. */
  deductions: Deduction[];
  /** The ones that could apply, in the order to ask about them. */
  candidates: Deduction[];
  outOfReach: Deduction[];
  /** "It does not apply": the review's and the draft's. */
  dismissed: string[];
  review: ReviewState;
  choices: Record<string, Choice>;
  savings: Record<string, DeductionSaving>;
  markedSaving: number;
  onDecide: (id: string, decision: Decision, choice?: Choice) => void;
  /** Bumped from the guided summary: the review starts. */
  startSignal: number;
  /** Every deduction of the review has an answer (the assistant then lets the person go on). */
  onDone?: () => void;
  /** «Have you invested in crypto or funds?»: the way to import them. */
  invest?: React.ReactNode;
  /** «See my result» (false in the assistant: its own button goes on). */
  resultLink?: boolean;
}

type Phase =
  | { name: 'intro' }
  | { name: 'walk'; queue: string[]; at: number }
  | { name: 'done'; queue: string[] };

type Status = 'marked' | 'dismissed' | 'later' | null;

const EMPTY: Choice = { on: false, amount: '', units: '' };

/** Why the income leaves a deduction out: its own note, or the limit. */
function LimitReason({ deduction }: { deduction: Deduction }) {
  const { t } = useI18n();
  const money = useMoney();
  // Only a deduction with an income limit can be out of reach.
  const limit = deduction.incomeLimit as IncomeLimit;
  return (
    <small>{limit.note ?? t('tools.renta.saving.limit', { limit: money(limit.individual) })}</small>
  );
}

/** "You cannot apply them with your income", with the reason of each one. */
function OutOfReach({ list }: { list: Deduction[] }) {
  const { t } = useI18n();
  if (list.length === 0) return null;
  return (
    <details className="renta-review-out">
      <summary>{t('tools.renta.review.outOfReach', { count: list.length })}</summary>
      <ul className="renta-questions">
        {list.map((d) => (
          <li key={d.id}>
            <span className="renta-review-out-title">{d.title}</span>
            <LimitReason deduction={d} />
          </li>
        ))}
      </ul>
    </details>
  );
}

/** What a deduction would save, as the full list says it. */
function Saving({ saving }: { saving: DeductionSaving }) {
  const { t } = useI18n();
  const money = useMoney();
  if (saving.saving <= 0) {
    return <p className="renta-saving">{t('tools.renta.saving.none')}</p>;
  }
  return (
    <p className="renta-saving">
      {t('tools.renta.review.saving')} <strong>{money(saving.saving)}</strong>
      {saving.example !== null && (
        <em> {t('tools.renta.saving.example', { amount: money(saving.example) })}</em>
      )}
    </p>
  );
}

interface ItemProps {
  deduction: Deduction;
  index: number;
  total: number;
  status: Status;
  choice: Choice;
  saving: DeductionSaving;
  place: string;
  heading: React.RefObject<HTMLHeadingElement | null>;
  onDecide: (decision: Decision, choice?: Choice) => void;
  onBack: (() => void) | null;
}

/** The amount a deduction is computed on, asked for when the person says it applies. */
function AmountField({
  input,
  deduction,
  value,
  error,
  onChange,
}: {
  input: React.RefObject<HTMLInputElement | null>;
  deduction: Deduction;
  value: string;
  error: boolean;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const id = `renta-review-amount-${deduction.id}`;
  return (
    <div className="tools-field">
      <label htmlFor={id}>
        {deduction.kind === 'percent'
          ? t('tools.renta.spent', { percent: deduction.percent as number })
          : t('tools.renta.special')}
      </label>
      <input
        ref={input}
        id={id}
        className="tx-input"
        inputMode="decimal"
        value={value}
        aria-invalid={error || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p id={`${id}-error`} className="form-error" role="alert">
          {t('tools.renta.review.amountError')}
        </p>
      )}
    </div>
  );
}

/** One deduction of the review: what it is, what it saves and the three answers. */
function ReviewItem({
  deduction,
  index,
  total,
  status,
  choice,
  saving,
  place,
  heading,
  onDecide,
  onBack,
}: ItemProps) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(choice.amount);
  const [error, setError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const asks = needsAmount(deduction);
  const label = (key: string) => `${t(key)}: ${deduction.title}`;

  const mark = (e: React.FormEvent) => {
    e.preventDefault();
    if (asks && !(number(amount) > 0)) {
      setError(true);
      (input.current as HTMLInputElement).focus();
      return;
    }
    onDecide('marked', { ...choice, on: true, amount: asks ? amount : choice.amount });
  };

  return (
    <form className="renta-review-item" onSubmit={mark} noValidate>
      <p id="renta-review-progress" className="renta-guide-count" aria-live="polite">
        {t('tools.renta.review.progress', { n: index + 1, total })}
      </p>
      <progress
        className="renta-progress"
        max={total}
        value={index + 1}
        aria-labelledby="renta-review-progress"
      />
      <p className="renta-review-place">{place}</p>
      <h3 ref={heading} tabIndex={-1}>
        {deduction.title}
      </h3>
      {status && (
        <p className={`renta-badge renta-badge--${status}`}>
          {t(`tools.renta.review.status.${status}`)}
        </p>
      )}
      <p>{deduction.summary}</p>
      <p className="renta-why">
        <strong>{t('tools.renta.requirements')}:</strong> {deduction.requirements}
      </p>
      {/* What it saves only once the person says it applies: not for a mere possibility. */}
      {status === 'marked' && <Saving saving={saving} />}
      <a href={deduction.url} target="_blank" rel="noopener noreferrer">
        {t('tools.renta.official')}
      </a>
      {asks && (
        <AmountField
          input={input}
          deduction={deduction}
          value={amount}
          error={error}
          onChange={(value) => {
            setAmount(value);
            setError(false);
          }}
        />
      )}
      <div className="button-row renta-review-nav">
        <button type="submit" className="btn-primary" aria-label={label('tools.renta.draft.yes')}>
          {t('tools.renta.draft.yes')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          aria-label={label('tools.renta.draft.no')}
          onClick={() => onDecide('dismissed')}
        >
          {t('tools.renta.draft.no')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          aria-label={label('tools.renta.review.later')}
          onClick={() => onDecide('later')}
        >
          {t('tools.renta.review.later')}
        </button>
        {onBack && (
          <button type="button" className="btn-secondary" onClick={onBack}>
            {t('tools.renta.guide.back')}
          </button>
        )}
      </div>
    </form>
  );
}

/** The end of the review: what was marked, dismissed and left, and what the marked ones save. */
function ReviewDone({
  queue,
  byId,
  props,
  heading,
  restart,
}: {
  queue: string[];
  byId: Map<string, Deduction>;
  props: ReviewProps;
  heading: React.RefObject<HTMLHeadingElement | null>;
  restart: (queue: string[]) => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const { choices, dismissed, candidates, review } = props;
  const marked = queue.filter((id) => choices[id]?.on);
  const out = queue.filter((id) => !choices[id]?.on && dismissed.includes(id));
  const pending = queue.filter((id) => !marked.includes(id) && !out.includes(id));
  const left = queueOf(candidates, review, dismissed);
  return (
    <div className="renta-review-done">
      <h3 ref={heading} tabIndex={-1}>
        {t('tools.renta.review.doneTitle')}
      </h3>
      <ul className="renta-review-counts">
        <li>{t('tools.renta.review.marked', { count: marked.length })}</li>
        <li>{t('tools.renta.review.dismissed', { count: out.length })}</li>
        <li>{t('tools.renta.review.pending', { count: pending.length })}</li>
      </ul>
      {pending.length > 0 && (
        <ul className="renta-questions">
          {pending.map((id) => (
            <li key={id}>{(byId.get(id) as Deduction).title}</li>
          ))}
        </ul>
      )}
      <p className="renta-saving-total" role="status">
        {t('tools.renta.review.saves')} <strong>{money(props.markedSaving)}</strong>
      </p>
      <div className="button-row renta-review-nav">
        {props.resultLink !== false && (
          <button type="button" className="btn-primary" onClick={() => reveal(null)}>
            {t('tools.renta.review.toResult')}
          </button>
        )}
        {left.length > 0 && (
          <button type="button" className="btn-secondary" onClick={() => restart(left)}>
            {t('tools.renta.review.reviewPending', { count: left.length })}
          </button>
        )}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => restart(candidates.map((d) => d.id))}
        >
          {t('tools.renta.review.again')}
        </button>
      </div>
    </div>
  );
}

/** Before the review: how many deductions there are to go through, and the way to start. */
function ReviewIntro({ props, start }: { props: ReviewProps; start: (queue: string[]) => void }) {
  const { t } = useI18n();
  const { candidates, review, dismissed, ccaa } = props;
  const queue = queueOf(candidates, review, dismissed);
  return (
    <div className="renta-review-intro">
      <p className="section-hint">{t('tools.renta.review.hint')}</p>
      {!ccaa && <p className="section-hint">{t('tools.renta.review.noCcaa')}</p>}
      {queue.length > 0 ? (
        <>
          <p>{t('tools.renta.review.count', { count: queue.length })}</p>
          <button type="button" className="btn-primary" onClick={() => start(queue)}>
            {t('tools.renta.review.start')}
          </button>
        </>
      ) : (
        <>
          <p>{t('tools.renta.review.none')}</p>
          {candidates.length > 0 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => start(candidates.map((d) => d.id))}
            >
              {t('tools.renta.review.again')}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** The status of a deduction in the review, as it is now. */
function statusOf(id: string, props: ReviewProps): Status {
  if (props.choices[id]?.on) return 'marked';
  if (props.dismissed.includes(id)) return 'dismissed';
  return props.review.later.includes(id) ? 'later' : null;
}

/** The deduction the review is at, with what the person said about it. */
function ReviewStep({
  walk,
  byId,
  props,
  heading,
  go,
}: {
  walk: { queue: string[]; at: number };
  byId: Map<string, Deduction>;
  props: ReviewProps;
  heading: React.RefObject<HTMLHeadingElement | null>;
  go: (queue: string[], at: number) => void;
}) {
  const { t } = useI18n();
  const { queue, at } = walk;
  // The review restarts when the community changes: every id is in the data.
  const deduction = byId.get(queue[at]) as Deduction;
  const place = deduction.id.startsWith('estado-')
    ? t('tools.renta.stateDeductions')
    : t('tools.renta.ccaaDeductions', { name: (props.ccaa as RentaCcaa).name });
  return (
    <ReviewItem
      key={deduction.id}
      deduction={deduction}
      index={at}
      total={queue.length}
      status={statusOf(deduction.id, props)}
      choice={props.choices[deduction.id] ?? EMPTY}
      saving={props.savings[deduction.id]}
      place={place}
      heading={heading}
      onDecide={(decision, choice) => {
        props.onDecide(deduction.id, decision, choice);
        go(queue, at + 1);
      }}
      onBack={at > 0 ? () => go(queue, at - 1) : null}
    />
  );
}

/**
 * "Deductions that could apply to you": one at a time, in a fixed order, so that none is forgotten.
 * The order is taken when the review starts: marking one does not move the others.
 */
export function DeductionReview(props: ReviewProps) {
  const { deductions, startSignal, outOfReach } = props;
  const [phase, setPhase] = useState<Phase>({ name: 'intro' });
  const heading = useRef<HTMLHeadingElement>(null);
  // The focus follows the person only once they move.
  const moved = useRef(false);
  const byId = new Map(deductions.map((d) => [d.id, d]));

  const show = (next: Phase) => {
    moved.current = true;
    setPhase(next);
    if (next.name === 'done') props.onDone?.();
  };
  const start = (queue: string[]) =>
    show(queue.length > 0 ? { name: 'walk', queue, at: 0 } : { name: 'done', queue });

  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [phase]);

  // Only a signal sent after it was shown starts it (not the one of before a new community).
  const seen = useRef(startSignal);
  useEffect(() => {
    if (startSignal === seen.current) return;
    seen.current = startSignal;
    start(queueOf(props.candidates, props.review, props.dismissed));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new signal starts it
  }, [startSignal]);

  const walk = phase.name === 'walk' ? phase : null;
  const go = (queue: string[], at: number) =>
    show(at < queue.length ? { name: 'walk', queue, at } : { name: 'done', queue });

  return (
    <Step n={props.n} titleKey="tools.renta.review.title" className="renta-review">
      {walk ? (
        <ReviewStep walk={walk} byId={byId} props={props} heading={heading} go={go} />
      ) : phase.name === 'done' ? (
        <ReviewDone
          queue={phase.queue}
          byId={byId}
          props={props}
          heading={heading}
          restart={start}
        />
      ) : (
        <ReviewIntro props={props} start={start} />
      )}
      {!walk && props.invest}
      {!walk && <OutOfReach list={outOfReach} />}
    </Step>
  );
}
