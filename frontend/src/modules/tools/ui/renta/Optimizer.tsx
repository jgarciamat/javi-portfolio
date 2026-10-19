import { useMemo, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { Deduction, RentaCcaa } from '../../domain/rentaData';
import { number, type RentaForm } from '../../domain/rentaForm';
import {
  optimize,
  savingOver,
  type Opportunity,
  type OptimizerData,
} from '../../domain/rentaOptimizer';
import { workReductionOf } from '../../domain/rentaWork';
import { rentaJoint } from '../../data/renta/conjunta';
import { rentaWorkExtras } from '../../data/renta/estado-extra';
import { rentaProperty } from '../../data/renta/inmuebles';
import { rentaState } from '../../data/renta/state';
import { Field, useMoney, type StepProps } from './shared';

/** The items whose real amount is asked once the person says yes, and the form field it goes to. */
const AMOUNTS: Record<string, (form: RentaForm, v: string) => Partial<RentaForm>> = {
  pensionPlan: (_, v) => ({ pension: v }),
  spousePlan: (_, v) => ({ spousePlan: v }),
  unionFees: (form, v) => ({ workExpenses: { ...form.workExpenses, 'cuotas-sindicales': v } }),
};
const amountOf = (form: RentaForm, id: string): string =>
  id === 'pensionPlan'
    ? form.pension
    : id === 'spousePlan'
    ? form.spousePlan
    : form.workExpenses['cuotas-sindicales'] ?? '';

/** Items that, once confirmed, only explain where to type it. */
const INFO = ['earlierLosses', 'rentalDepreciation'];
/** Worked out from what the person already said (the partner's data): no question to ask. */
const AUTO = ['joint'];

type Answer = 'yes' | 'no' | 'unknown';

const k = (id: string) => `tools.renta.opt.${id}`;

/** A possible saving, still a question: no figure until the person says it applies. */
function Question({ item, onAnswer }: { item: Opportunity; onAnswer: (a: Answer) => void }) {
  const { t } = useI18n();
  const title = t(`${k(item.id)}.title`);
  return (
    <li className="renta-deduction">
      <strong>{title}</strong>
      <p>{t(`${k(item.id)}.question`)}</p>
      <small className="renta-field-hint">
        {t(`tools.renta.opt.draft.${item.draftKnows}`)}
      </small>{' '}
      <a href={item.source} target="_blank" rel="noopener noreferrer">
        {t('tools.renta.official')}
      </a>
      <div className="button-row" role="group" aria-label={title}>
        {(['yes', 'no', 'unknown'] as const).map((a) => (
          <button
            key={a}
            type="button"
            className={a === 'yes' ? 'btn-primary' : 'btn-secondary'}
            aria-label={`${t(`tools.renta.opt.answer.${a}`)}: ${title}`}
            onClick={() => onAnswer(a)}
          >
            {t(`tools.renta.opt.answer.${a}`)}
          </button>
        ))}
      </div>
    </li>
  );
}

/** A confirmed one: what it saves (with the example amount while none is typed) and what to do. */
function Confirmed({
  item,
  saving,
  example,
  form,
  set,
}: { item: Opportunity; saving: number; example: number | null } & StepProps) {
  const { t } = useI18n();
  const money = useMoney();
  const amount = AMOUNTS[item.id];
  return (
    <li className="renta-deduction">
      <strong>{t(`${k(item.id)}.title`)}</strong>
      {AUTO.includes(item.id) && <p>{t(`${k(item.id)}.question`)}</p>}
      <p className="renta-gives">
        {t('tools.renta.opt.saves')} <strong>{money(saving)}</strong>
        {example !== null && <em> {t('tools.renta.opt.example', { amount: money(example) })}</em>}
      </p>
      {amount ? (
        <Field
          id={`renta-opt-${item.id}`}
          label={t(`${k(item.id)}.amount`)}
          value={amountOf(form, item.id)}
          onChange={(v) => set(amount(form, v))}
        />
      ) : INFO.includes(item.id) || AUTO.includes(item.id) ? (
        <p className="section-hint">{t(`${k(item.id)}.how`)}</p>
      ) : (
        <p className="section-hint">{t('tools.renta.opt.applied')}</p>
      )}
    </li>
  );
}

/**
 * The reviewer: what could lower the tax and is not in the data, each one first as a question. Only
 * what the person confirms gets a saving (and counts in the total); a «no» or «I do not know» is
 * put aside without a figure. The deductions are gone through in their own review: here, how many
 * are left. Orientative only.
 */
export function Optimizer({
  form,
  set,
  ccaa,
  found,
}: StepProps & {
  ccaa: RentaCcaa | null;
  /** The deductions that could apply and are still to decide (not marked, not dismissed). */
  found: Deduction[];
}) {
  const { t } = useI18n();
  const money = useMoney();
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  // What a confirmed one saved when the person said yes (its change is in the form since then).
  const [kept, setKept] = useState<Record<string, Opportunity>>({});
  const reduction = useMemo(() => workReductionOf(rentaState), []);
  const data = useMemo<OptimizerData | null>(
    () =>
      ccaa && {
        state: rentaState,
        ccaa,
        extras: rentaWorkExtras,
        property: rentaProperty,
        workReduction: reduction,
        joint: rentaJoint,
      },
    [ccaa, reduction]
  );
  const result = useMemo(
    // The deductions have their own review (with their savings once marked): only their count here.
    () => data && optimize(form, data, { list: [], savings: {} }),
    [form, data]
  );
  if (!result || !data) return null;
  const now = new Map(result.items.map((i) => [i.id, i]));

  const answer = (item: Opportunity, a: Answer) => {
    setAnswers((all) => ({ ...all, [item.id]: a }));
    if (a !== 'yes') return;
    setKept((all) => ({ ...all, [item.id]: item }));
    if (!AMOUNTS[item.id] && !INFO.includes(item.id)) set(item.patch);
  };
  const ask = (id: string) =>
    setAnswers((all) => {
      const { [id]: _, ...rest } = all;
      return rest;
    });

  // A change applied that is back as a possibility (the data changed again) is asked again.
  const isConfirmed = (id: string) =>
    answers[id] === 'yes' && (!!AMOUNTS[id] || INFO.includes(id) || !now.has(id));
  const confirmed = [
    ...result.items.filter((i) => AUTO.includes(i.id)),
    ...Object.values(kept).filter((i) => isConfirmed(i.id)),
  ].map((item) => {
    const typed = number(AMOUNTS[item.id] ? amountOf(form, item.id) : '') > 0;
    return typed
      ? { item, saving: savingOver(form, data, AMOUNTS[item.id](form, '')), example: null }
      : { item, saving: item.saving, example: item.example };
  });
  const questions = result.items.filter(
    (i) =>
      !AUTO.includes(i.id) &&
      !isConfirmed(i.id) &&
      answers[i.id] !== 'no' &&
      answers[i.id] !== 'unknown'
  );
  const archived = Object.keys(answers).filter((id) => answers[id] !== 'yes');
  const total = confirmed.reduce((sum, c) => sum + c.saving, 0);
  const nothing = questions.length === 0 && found.length === 0;

  return (
    <section className="renta-block renta-optimizer" aria-label={t('tools.renta.opt.title')}>
      <h3>{t('tools.renta.opt.title')}</h3>
      <p className="section-hint">{t('tools.renta.opt.hint')}</p>
      {result.missing.length > 0 && (
        <div className="form-error">
          <p>{t('tools.renta.opt.missing')}</p>
          <ul>
            {result.missing.map((m) => (
              <li key={m}>{t(`tools.renta.opt.missing.${m}`)}</li>
            ))}
          </ul>
        </div>
      )}
      {confirmed.length > 0 && (
        <>
          <p className="renta-saving-total" role="status">
            {t('tools.renta.opt.total', { count: confirmed.length, amount: money(total) })}
          </p>
          <ol className="renta-deductions">
            {confirmed.map((c) => (
              <Confirmed key={c.item.id} {...c} form={form} set={set} />
            ))}
          </ol>
        </>
      )}
      {nothing ? (
        <p className="section-hint" role="status">
          {t(
            confirmed.length + archived.length > 0
              ? 'tools.renta.opt.noneLeft'
              : 'tools.renta.opt.none'
          )}
        </p>
      ) : (
        <ol className="renta-deductions" aria-label={t('tools.renta.opt.toAsk')}>
          {questions.map((item) => (
            <Question key={item.id} item={item} onAnswer={(a) => answer(item, a)} />
          ))}
          {found.length > 0 && (
            <li className="renta-deduction">
              <strong>{t('tools.renta.opt.deductions.title')}</strong>
              <p>{t('tools.renta.opt.deductions.left', { count: found.length })}</p>
              <p className="section-hint">{t('tools.renta.opt.deductions.how')}</p>
            </li>
          )}
        </ol>
      )}
      {archived.length > 0 && (
        <details className="renta-review-out">
          <summary>{t('tools.renta.opt.archived', { count: archived.length })}</summary>
          <ul className="renta-questions">
            {archived.map((id) => (
              <li key={id}>
                <span className="renta-review-out-title">{t(`${k(id)}.title`)}</span>{' '}
                <button type="button" className="btn-secondary" onClick={() => ask(id)}>
                  {t('tools.renta.opt.askAgain')}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="section-hint">{t('tools.renta.opt.disclaimer')}</p>
    </section>
  );
}
