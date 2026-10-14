import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { deductionAmount, type Family } from '../../domain/rentaCalc';
import type { Deduction, DeductionGroup, RentaCcaa, RentaState } from '../../domain/rentaData';
import type { Choice } from '../../domain/rentaForm';
import { number } from '../../domain/rentaForm';
import { Step, markedAfter, reveal, rowId, useMoney } from './shared';

const GROUPS: DeductionGroup[] = ['family', 'housing', 'health', 'education', 'donations', 'other'];
export type Hint = 'inDraft' | 'missing';
const EMPTY: Choice = { on: false, amount: '', units: '' };

/** One deduction: what it gives, who it is for and the fields to see what it would save. */
function DeductionRow({
  deduction,
  choice,
  childCount,
  suggested,
  blocked,
  hint,
  onChange,
}: {
  deduction: Deduction;
  choice: Choice;
  childCount: number;
  suggested: boolean;
  blocked: boolean;
  hint?: Hint;
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
  const needsAmount = deduction.kind === 'percent' || deduction.kind === 'special';
  const perChild = !!deduction.perChild && deduction.perChild.length > 0;

  return (
    <li
      id={rowId(deduction.id)}
      data-pending={choice.on && needsAmount && number(choice.amount) <= 0 ? 'true' : undefined}
      tabIndex={-1}
      className={`renta-deduction${choice.on ? ' renta-deduction--on' : ''}`}
    >
      <label className="renta-deduction-head">
        <input
          type="checkbox"
          checked={choice.on}
          onChange={(e) => onChange({ ...choice, on: e.target.checked })}
        />
        <span>
          <strong>{deduction.title}</strong>
          {suggested && <em className="renta-badge">{t('tools.renta.suggested')}</em>}
          {hint && (
            <em className={`renta-badge renta-badge--${hint}`}>{t(`tools.renta.hint.${hint}`)}</em>
          )}
          <small>{deduction.summary}</small>
        </span>
      </label>
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
      {choice.on && blocked && (
        <p className="form-error" role="alert">
          {t('tools.renta.blocked')}
        </p>
      )}
      {choice.on && (
        <div className="renta-deduction-fields">
          {deduction.kind === 'fixed' && (perChild || deduction.unit) && (
            <label className="tools-field">
              <span>
                {t('tools.renta.units', { unit: deduction.unit ?? t('tools.renta.child') })}
              </span>
              <input
                className="tx-input"
                inputMode="numeric"
                value={choice.units}
                placeholder={String(childCount || 1)}
                onChange={(e) => onChange({ ...choice, units: e.target.value })}
              />
            </label>
          )}
          {deduction.kind === 'percent' && (
            <label className="tools-field">
              <span>{t('tools.renta.spent', { percent: deduction.percent as number })}</span>
              <input
                className="tx-input"
                inputMode="decimal"
                value={choice.amount}
                onChange={(e) => onChange({ ...choice, amount: e.target.value })}
              />
            </label>
          )}
          {deduction.kind === 'special' && (
            <label className="tools-field">
              <span>{t('tools.renta.special')}</span>
              <input
                className="tx-input"
                inputMode="decimal"
                value={choice.amount}
                onChange={(e) => onChange({ ...choice, amount: e.target.value })}
              />
            </label>
          )}
          {!blocked && (
            <p className="renta-gives">
              {t('tools.renta.gives')} <strong>{money(value)}</strong>
            </p>
          )}
        </div>
      )}
      {choice.on && (
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
      )}
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
        const items = visible.filter((d) => d.group === group);
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
  onChange,
}: {
  state: RentaState;
  ccaa: RentaCcaa | null;
  loadError: boolean;
  choices: Record<string, Choice>;
  family: Family;
  blocked: string[];
  hints: Record<string, Hint>;
  onChange: (id: string, choice: Choice) => void;
}) {
  const { t } = useI18n();
  const foral = ccaa?.regime === 'foral';
  return (
    <Step n={4} titleKey="tools.renta.step3">
      <p className="section-hint">{t('tools.renta.deductionsHint')}</p>
      <DeductionList
        title={t('tools.renta.stateDeductions')}
        hint={t('tools.renta.stateHint')}
        deductions={state.deductions}
        choices={choices}
        family={family}
        blocked={blocked}
        hints={hints}
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
          openGroups={['family', 'health', 'education']}
          onChange={onChange}
        />
      )}
      {!ccaa && !loadError && <p className="section-hint">{t('tools.renta.pickCcaa')}</p>}
    </Step>
  );
}
