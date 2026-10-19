import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { deductionAmount, type Family } from '../../domain/rentaCalc';
import type {
  Deduction,
  DeductionGroup,
  IncomeLimit,
  RentaCcaa,
  RentaState,
} from '../../domain/rentaData';
import type { Choice } from '../../domain/rentaForm';
import { number } from '../../domain/rentaForm';
import type { DeductionSaving } from '../../domain/rentaSavings';
import { Step, markedAfter, reveal, rowId, useMoney } from './shared';

const GROUPS: DeductionGroup[] = ['family', 'housing', 'health', 'education', 'donations', 'other'];
export type Hint = 'inDraft' | 'missing';
const EMPTY: Choice = { on: false, amount: '', units: '' };
const NO_SAVING: DeductionSaving = { saving: 0, blocked: false, example: null };

/** Highest saving first; the ones the income does not allow, at the end (the sort keeps ties in order). */
export const bySaving =
  (savings: Record<string, DeductionSaving>) => (a: Deduction, b: Deduction) => {
    const x = savings[a.id] ?? NO_SAVING;
    const y = savings[b.id] ?? NO_SAVING;
    if (x.blocked !== y.blocked) return x.blocked ? 1 : -1;
    return y.saving - x.saving;
  };

/** What a deduction saves with the data as it is, or why it cannot be used. */
function SavingLine({
  deduction,
  on,
  saving,
}: {
  deduction: Deduction;
  on: boolean;
  saving: DeductionSaving;
}) {
  const { t } = useI18n();
  const money = useMoney();
  if (saving.blocked) {
    // Only an income limit blocks a deduction.
    const limit = deduction.incomeLimit as IncomeLimit;
    return (
      <small className="renta-saving renta-saving--blocked">
        {t('tools.renta.saving.blocked')}{' '}
        {limit.note ?? t('tools.renta.saving.limit', { limit: money(limit.individual) })}
      </small>
    );
  }
  const amount = money(saving.saving);
  return (
    <small className="renta-saving">
      {saving.saving <= 0
        ? t('tools.renta.saving.none')
        : on
        ? t('tools.renta.saving.on', { amount })
        : t('tools.renta.saving.off', { amount })}
      {saving.example !== null && (
        <em> {t('tools.renta.saving.example', { amount: money(saving.example) })}</em>
      )}
    </small>
  );
}

/** The checkbox of a deduction, its title and its badges. */
function DeductionHead({
  deduction,
  choice,
  suggested,
  hint,
  saving,
  onChange,
}: {
  deduction: Deduction;
  choice: Choice;
  suggested: boolean;
  hint?: Hint;
  saving: DeductionSaving;
  onChange: (choice: Choice) => void;
}) {
  const { t } = useI18n();
  return (
    <label className="renta-deduction-head">
      <input
        type="checkbox"
        checked={choice.on}
        onChange={(e) => onChange({ ...choice, on: e.target.checked })}
      />
      <span>
        <strong>{deduction.title}</strong>
        {suggested && <em className="renta-badge">{t('tools.renta.suggested')}</em>}
        {deduction.advance && (
          <em className="renta-badge renta-badge--model">
            {t('tools.renta.model', { model: deduction.advance.model })}
          </em>
        )}
        {hint && (
          <em className={`renta-badge renta-badge--${hint}`}>{t(`tools.renta.hint.${hint}`)}</em>
        )}
        <small>{deduction.summary}</small>
        <SavingLine deduction={deduction} on={choice.on} saving={saving} />
      </span>
    </label>
  );
}

/** The fine print of a deduction: advance payments, income limit and requirements. */
function DeductionInfo({ deduction }: { deduction: Deduction }) {
  const { t } = useI18n();
  return (
    <>
      {deduction.advance && (
        <small className="renta-advance">
          {t('tools.renta.advance', { model: deduction.advance.model })}{' '}
          <a href={deduction.advance.url} target="_blank" rel="noopener noreferrer">
            {t('tools.renta.advanceLink', { model: deduction.advance.model })}
          </a>
        </small>
      )}
      {deduction.incomeLimit?.note && (
        <small className="renta-limit">
          {t('tools.renta.incomeLimit')}: {deduction.incomeLimit.note}
        </small>
      )}
      <details className="renta-requirements">
        <summary>{t('tools.renta.requirements')}</summary>
        <p>{deduction.requirements}</p>
        <a href={deduction.url} target="_blank" rel="noopener noreferrer">
          {t('tools.renta.official')}
        </a>
      </details>
    </>
  );
}

/** The field a marked deduction asks for, depending on its kind. */
function DeductionInput({
  deduction,
  choice,
  childCount,
  onChange,
}: {
  deduction: Deduction;
  choice: Choice;
  childCount: number;
  onChange: (choice: Choice) => void;
}) {
  const { t } = useI18n();
  const perChild = !!deduction.perChild && deduction.perChild.length > 0;
  if (deduction.kind === 'fixed') {
    if (!perChild && !deduction.unit) return null;
    return (
      <label className="tools-field">
        <span>{t('tools.renta.units', { unit: deduction.unit ?? t('tools.renta.child') })}</span>
        <input
          className="tx-input"
          inputMode="numeric"
          value={choice.units}
          placeholder={String(childCount || 1)}
          onChange={(e) => onChange({ ...choice, units: e.target.value })}
        />
      </label>
    );
  }
  // A percentage of what was spent, or an amount given as it is.
  return (
    <label className="tools-field">
      <span>
        {deduction.kind === 'percent'
          ? t('tools.renta.spent', { percent: deduction.percent as number })
          : t('tools.renta.special')}
      </span>
      <input
        className="tx-input"
        inputMode="decimal"
        value={choice.amount}
        onChange={(e) => onChange({ ...choice, amount: e.target.value })}
      />
    </label>
  );
}

/** The buttons of a marked deduction: on to the next one, or not this one after all. */
function DeductionNav({
  deduction,
  choice,
  onChange,
}: {
  deduction: Deduction;
  choice: Choice;
  onChange: (choice: Choice) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="button-row renta-deduction-nav">
      <button className="btn-primary" onClick={() => reveal(markedAfter(deduction.id))}>
        {t('tools.renta.nextDeduction')}
      </button>
      <button
        className="btn-secondary"
        onClick={() => {
          // The next one is found first: this row is about to stop being marked.
          const next = markedAfter(deduction.id);
          onChange({ ...choice, on: false });
          reveal(next);
        }}
      >
        {t('tools.renta.draft.no')}
      </button>
    </div>
  );
}

/** A marked deduction still waiting for the amount it is computed from. */
const isPending = (deduction: Deduction, choice: Choice) =>
  choice.on &&
  (deduction.kind === 'percent' || deduction.kind === 'special') &&
  number(choice.amount) <= 0;

/** One deduction: what it gives, who it is for and the fields to see what it would save. */
function DeductionRow({
  deduction,
  choice,
  childCount,
  suggested,
  blocked,
  hint,
  saving,
  onChange,
}: {
  deduction: Deduction;
  choice: Choice;
  childCount: number;
  suggested: boolean;
  blocked: boolean;
  hint?: Hint;
  saving: DeductionSaving;
  onChange: (choice: Choice) => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const value = deductionAmount(
    deduction,
    {
      on: choice.on,
      amount: number(choice.amount),
      units: choice.units === '' ? childCount || 1 : number(choice.units),
    },
    1
  );

  return (
    <li
      id={rowId(deduction.id)}
      data-pending={isPending(deduction, choice) ? 'true' : undefined}
      tabIndex={-1}
      className={`renta-deduction${choice.on ? ' renta-deduction--on' : ''}`}
    >
      <DeductionHead
        deduction={deduction}
        choice={choice}
        suggested={suggested}
        hint={hint}
        saving={saving}
        onChange={onChange}
      />
      <DeductionInfo deduction={deduction} />
      {choice.on && blocked && (
        <p className="form-error" role="alert">
          {t('tools.renta.blocked')}
        </p>
      )}
      {choice.on && (
        <div className="renta-deduction-fields">
          <DeductionInput
            deduction={deduction}
            choice={choice}
            childCount={childCount}
            onChange={onChange}
          />
          {!blocked && (
            <p className="renta-gives">
              {t('tools.renta.gives')} <strong>{money(value)}</strong>
            </p>
          )}
        </div>
      )}
      {choice.on && <DeductionNav deduction={deduction} choice={choice} onChange={onChange} />}
    </li>
  );
}

function DeductionList({
  title,
  hint,
  deductions,
  choices,
  family,
  blocked,
  hints,
  savings,
  openGroups,
  onChange,
}: {
  title: string;
  hint?: string;
  deductions: Deduction[];
  choices: Record<string, Choice>;
  family: Family;
  blocked: string[];
  hints: Record<string, Hint>;
  savings: Record<string, DeductionSaving>;
  openGroups: DeductionGroup[];
  onChange: (id: string, choice: Choice) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const visible = deductions.filter(
    (d) => !normalized || `${d.title} ${d.summary}`.toLowerCase().includes(normalized)
  );
  const under3 = family.children.some((c) => c.age < 3);
  const isSuggested = (d: Deduction) => /maternidad/.test(d.id) && under3;

  return (
    <section className="renta-block">
      <h3>{title}</h3>
      {hint && <p className="section-hint">{hint}</p>}
      <input
        className="tx-input"
        type="search"
        placeholder={t('tools.renta.search')}
        aria-label={`${t('tools.renta.search')} (${title})`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {visible.length === 0 && <p className="section-hint">{t('tools.renta.noMatch')}</p>}
      {GROUPS.map((group) => {
        const items = visible.filter((d) => d.group === group).sort(bySaving(savings));
        if (items.length === 0) return null;
        return (
          <details
            key={group}
            className="renta-group"
            open={!!normalized || openGroups.includes(group)}
          >
            <summary>
              {t(`tools.renta.group.${group}`)} <span>({items.length})</span>
            </summary>
            <ul className="renta-deductions">
              {items.map((d) => (
                <DeductionRow
                  key={d.id}
                  deduction={d}
                  choice={choices[d.id] ?? EMPTY}
                  childCount={family.children.length}
                  suggested={isSuggested(d)}
                  blocked={blocked.includes(d.id)}
                  hint={hints[d.id]}
                  saving={savings[d.id] ?? NO_SAVING}
                  onChange={(c) => onChange(d.id, c)}
                />
              ))}
            </ul>
          </details>
        );
      })}
    </section>
  );
}

/** Marked deductions that still need an amount: a warning and a way to the first one. */
export function PendingNotice({ pending }: { pending: string[] }) {
  const { t } = useI18n();
  if (pending.length === 0) return null;
  return (
    <div className="form-error renta-pending" role="alert">
      <p>{t('tools.renta.pending', { count: pending.length })}</p>
      <button
        className="btn-secondary"
        onClick={() =>
          // The first one on the page, whatever the order of the lists.
          reveal(document.querySelector<HTMLElement>('.renta-deduction[data-pending]'))
        }
      >
        {t('tools.renta.goToPending')}
      </button>
    </div>
  );
}

/** Step 4: the deductions of the State and of the community, by group. */
export function DeductionsStep({
  state,
  ccaa,
  loadError,
  choices,
  family,
  blocked,
  hints,
  savings,
  markedSaving,
  onChange,
  n = 4,
}: {
  state: RentaState;
  ccaa: RentaCcaa | null;
  loadError: boolean;
  choices: Record<string, Choice>;
  family: Family;
  blocked: string[];
  hints: Record<string, Hint>;
  /** What each deduction saves with the data as it is, by id. */
  savings: Record<string, DeductionSaving>;
  /** What the marked ones save together. */
  markedSaving: number;
  onChange: (id: string, choice: Choice) => void;
  /** The number of the step (the guided mode has fewer before it). */
  n?: number;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const foral = ccaa?.regime === 'foral';
  const marked = Object.values(choices).some((c) => c.on);
  return (
    <Step n={n} titleKey="tools.renta.step3">
      <p className="section-hint">{t('tools.renta.deductionsHint')}</p>
      <p className="section-hint">{t('tools.renta.saving.hint')}</p>
      {marked && (
        <p className="renta-saving-total" role="status">
          {t('tools.renta.saving.total')} <strong>{money(markedSaving)}</strong>
        </p>
      )}
      <DeductionList
        title={t('tools.renta.stateDeductions')}
        hint={t('tools.renta.stateHint')}
        deductions={state.deductions}
        choices={choices}
        family={family}
        blocked={blocked}
        hints={hints}
        savings={savings}
        openGroups={['family', 'housing']}
        onChange={onChange}
      />
      {ccaa && !foral && (
        <DeductionList
          title={t('tools.renta.ccaaDeductions', { name: ccaa.name })}
          hint={t('tools.renta.ccaaHint', { count: ccaa.deductions.length })}
          deductions={ccaa.deductions}
          choices={choices}
          family={family}
          blocked={blocked}
          hints={hints}
          savings={savings}
          openGroups={['family', 'health', 'education']}
          onChange={onChange}
        />
      )}
      {!ccaa && !loadError && <p className="section-hint">{t('tools.renta.pickCcaa')}</p>}
    </Step>
  );
}
