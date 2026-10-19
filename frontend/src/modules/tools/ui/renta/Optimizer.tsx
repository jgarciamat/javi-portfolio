import { useMemo, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { Deduction, RentaCcaa } from '../../domain/rentaData';
import type { RentaForm } from '../../domain/rentaForm';
import { optimize, type Opportunity } from '../../domain/rentaOptimizer';
import type { DeductionSaving } from '../../domain/rentaSavings';
import { workReductionOf } from '../../domain/rentaWork';
import { rentaJoint } from '../../data/renta/conjunta';
import { rentaWorkExtras } from '../../data/renta/estado-extra';
import { rentaProperty } from '../../data/renta/inmuebles';
import { rentaState } from '../../data/renta/state';
import { Field, useMoney, type StepProps } from './shared';

/** The items whose real amount is asked right here, and the form field it goes to. */
const AMOUNTS: Record<string, (form: RentaForm, v: string) => Partial<RentaForm>> = {
  pensionPlan: (_, v) => ({ pension: v }),
  spousePlan: (_, v) => ({ spousePlan: v }),
  unionFees: (form, v) => ({ workExpenses: { ...form.workExpenses, 'cuotas-sindicales': v } }),
  rentalDepreciation: (_, v) => ({ construction: v }),
};
const amountOf = (form: RentaForm, id: string): string =>
  id === 'pensionPlan'
    ? form.pension
    : id === 'spousePlan'
    ? form.spousePlan
    : id === 'unionFees'
    ? form.workExpenses['cuotas-sindicales'] ?? ''
    : form.construction;

/** Items that only explain what to do: the joint return and the losses of earlier years. */
const INFO = ['joint', 'earlierLosses', 'deductions'];

function Item({
  item,
  form,
  set,
  onDismiss,
}: {
  item: Opportunity;
  onDismiss: () => void;
} & StepProps) {
  const { t } = useI18n();
  const money = useMoney();
  const k = `tools.renta.opt.${item.id}`;
  const title = t(`${k}.title`);
  const question = t(`${k}.question`, { count: item.example ?? 0 });
  const amount = AMOUNTS[item.id];
  return (
    <li className="renta-deduction">
      <strong>{title}</strong>
      <p>{question}</p>
      <p className="renta-gives">
        {t('tools.renta.opt.saves')} <strong>{money(item.saving)}</strong>
        {item.example !== null && (
          <em> {t('tools.renta.opt.example', { amount: money(item.example) })}</em>
        )}
      </p>
      <small className="renta-field-hint">{t(`tools.renta.opt.draft.${item.draftKnows}`)}</small>{' '}
      <a href={item.source} target="_blank" rel="noopener noreferrer">
        {t('tools.renta.official')}
      </a>
      {amount ? (
        <Field
          id={`renta-opt-${item.id}`}
          label={t(`${k}.amount`)}
          value={amountOf(form, item.id)}
          onChange={(v) => set(amount(form, v))}
        />
      ) : INFO.includes(item.id) ? (
        <p className="section-hint">{t(`${k}.how`)}</p>
      ) : (
        <div className="button-row">
          <button className="btn-primary" onClick={() => set(item.patch)}>
            {t('tools.renta.opt.yes')}
          </button>
          <button className="btn-secondary" onClick={onDismiss}>
            {t('tools.renta.opt.no')}
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * The reviewer: what could lower the tax and is not in the data, the highest saving first, with
 * the question, the estimate and the official source of each one. Orientative only.
 */
export function Optimizer({
  form,
  set,
  ccaa,
  found,
  savings,
}: StepProps & {
  ccaa: RentaCcaa | null;
  /** The deductions that could apply and are not marked (from the review). */
  found: Deduction[];
  savings: Record<string, DeductionSaving>;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const reduction = useMemo(() => workReductionOf(rentaState), []);
  const result = useMemo(
    () =>
      ccaa
        ? optimize(
            form,
            {
              state: rentaState,
              ccaa,
              extras: rentaWorkExtras,
              property: rentaProperty,
              workReduction: reduction,
              joint: rentaJoint,
            },
            { list: found, savings }
          )
        : null,
    [form, ccaa, reduction, found, savings]
  );
  if (!result) return null;
  // The deductions are gone through one by one in their own review: here, one line for all of them,
  // at the place of the best one.
  const deductions = result.items.filter((i) => i.group === 'deductions');
  const others = result.items.filter((i) => i.group !== 'deductions');
  const best = deductions[0];
  const summary: Opportunity[] = best
    ? [{ ...best, id: 'deductions', title: undefined, example: deductions.length, patch: {} }]
    : [];
  const items = [...others, ...summary]
    .sort((a, b) => b.saving - a.saving)
    .filter((i) => !dismissed.includes(i.id));
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
      {items.length === 0 ? (
        <p className="section-hint">{t('tools.renta.opt.none')}</p>
      ) : (
        <>
          <p className="renta-saving-total" role="status">
            {t('tools.renta.opt.total', {
              count: items.length,
              amount: money(items.reduce((sum, i) => sum + i.saving, 0)),
            })}
          </p>
          <ol className="renta-deductions">
            {items.map((item) => (
              <Item
                key={item.id}
                item={item}
                form={form}
                set={set}
                onDismiss={() => setDismissed((d) => [...d, item.id])}
              />
            ))}
          </ol>
        </>
      )}
      <p className="section-hint">{t('tools.renta.opt.disclaimer')}</p>
    </section>
  );
}
