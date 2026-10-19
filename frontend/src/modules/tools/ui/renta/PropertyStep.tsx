import { useI18n } from '@core/i18n/I18nContext';
import type { RentaProperty } from '../../domain/rentaExtras';
import { SavingsDetailSection } from './SavingsDetail';
import { Field, Step, type StepProps } from './shared';

/** Rented properties: the income, the expenses and the reduction that applies. */
export function RentalSection({
  form,
  set,
  rental,
  toggle = true,
}: StepProps & {
  rental: RentaProperty['rental'];
  /** The check box to turn it on (the guided question asks it on its own). */
  toggle?: boolean;
}) {
  const { t } = useI18n();
  return (
    <>
      {toggle && (
        <label className="renta-check">
          <input
            type="checkbox"
            checked={form.rentalOn}
            onChange={(e) => set({ rentalOn: e.target.checked })}
          />
          <span>{t('tools.renta.rentalOn')}</span>
        </label>
      )}
      {form.rentalOn && (
        <div className="renta-block">
          <div className="tools-form">
            <Field
              id="renta-rent"
              label={t('tools.renta.rentalIncome')}
              value={form.rentalIncome}
              onChange={(v) => set({ rentalIncome: v })}
            />
            {rental.expenses.map((item) => (
              <Field
                key={item.id}
                id={`renta-rental-${item.id}`}
                label={item.title}
                hint={[item.summary, item.limitNote].filter(Boolean).join(' ')}
                value={form.rentalExpenses[item.id] ?? ''}
                onChange={(v) => set({ rentalExpenses: { ...form.rentalExpenses, [item.id]: v } })}
              />
            ))}
            <Field
              id="renta-pending-excess"
              label={t('tools.renta.rentalPendingExcess')}
              hint={t('tools.renta.rentalPendingExcessHint')}
              value={form.rentalPendingExcess ?? ''}
              onChange={(v) => set({ rentalPendingExcess: v })}
            />
            <Field
              id="renta-construction"
              label={t('tools.renta.construction')}
              hint={rental.amortizationNote}
              value={form.construction}
              onChange={(v) => set({ construction: v })}
            />
            <div className="tools-field">
              <label htmlFor="renta-reduction">{t('tools.renta.rentalReduction')}</label>
              <select
                id="renta-reduction"
                className="tx-input"
                value={form.rentalReduction}
                onChange={(e) => set({ rentalReduction: e.target.value })}
              >
                <option value="">{t('tools.renta.noReduction')}</option>
                {rental.reductions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.percent} % · {r.title}
                  </option>
                ))}
              </select>
              {rental.reductions
                .filter((r) => r.id === form.rentalReduction)
                .map((r) => (
                  <small key={r.id} className="renta-field-hint">
                    {r.requirements}{' '}
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      {t('tools.renta.official')}
                    </a>
                  </small>
                ))}
            </div>
          </div>
          <p className="section-hint">{rental.notes}</p>
        </div>
      )}
    </>
  );
}

/** Properties that are not rented: the imputed income of each one. */
export function UnrentedSection({
  form,
  set,
  imputation,
}: StepProps & { imputation: RentaProperty['imputation'] }) {
  const { t } = useI18n();
  const setUnrented = (i: number, patch: Partial<(typeof form.unrented)[number]>) =>
    set({ unrented: form.unrented.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  return (
    <>
      <h3>{t('tools.renta.unrented')}</h3>
      <p className="section-hint">{imputation.summary}</p>
      <ul className="renta-people">
        {form.unrented.map((p, i) => (
          <li key={i}>
            <label className="tools-field">
              <span>{t('tools.renta.cadastral', { n: i + 1 })}</span>
              <input
                className="tx-input"
                inputMode="decimal"
                value={p.value}
                onChange={(e) => setUnrented(i, { value: e.target.value })}
              />
            </label>
            <label className="tools-field">
              <span>{t('tools.renta.days', { n: i + 1 })}</span>
              <input
                className="tx-input"
                inputMode="numeric"
                placeholder="365"
                value={p.days}
                onChange={(e) => setUnrented(i, { days: e.target.value })}
              />
            </label>
            <label className="renta-check">
              <input
                type="checkbox"
                checked={p.revised}
                onChange={(e) => setUnrented(i, { revised: e.target.checked })}
              />
              <span>{t('tools.renta.revised', { rate: imputation.revisedRate })}</span>
            </label>
            <button
              type="button"
              className="btn-secondary"
              aria-label={t('tools.renta.removeUnrented', { n: i + 1 })}
              onClick={() => set({ unrented: form.unrented.filter((_, j) => j !== i) })}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="button-row">
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            set({ unrented: [...form.unrented, { value: '', revised: false, days: '' }] })
          }
        >
          + {t('tools.renta.addUnrented')}
        </button>
      </div>
      <details className="renta-requirements">
        <summary>{t('tools.renta.requirements')}</summary>
        <p>{imputation.requirements}</p>
        <a href={imputation.url} target="_blank" rel="noopener noreferrer">
          {t('tools.renta.official')}
        </a>
      </details>
    </>
  );
}

/** Step 3: rented properties, properties that are not rented, other savings and notes on property. */
export function PropertyStep({ form, set, property }: StepProps & { property: RentaProperty }) {
  const { t } = useI18n();

  return (
    <Step n={3} titleKey="tools.renta.step3Property">
      <RentalSection form={form} set={set} rental={property.rental} />

      <UnrentedSection form={form} set={set} imputation={property.imputation} />

      <h3>{t('tools.renta.savingsTitle')}</h3>
      {/* With the detail the savings base is worked out from it: the net amount is not asked. */}
      {!form.savingsDetail && (
        <div className="tools-form">
          <Field
            id="renta-savings"
            label={t('tools.renta.savings')}
            hint={t('tools.renta.savingsHint')}
            value={form.savings}
            onChange={(v) => set({ savings: v })}
          />
        </div>
      )}
      <SavingsDetailSection form={form} set={set} importer={false} />

      <h3>{t('tools.renta.propertyNotes')}</h3>
      <ul className="renta-notes">
        {property.notes.map((n) => (
          <li key={n.id}>
            <details>
              <summary>{n.title}</summary>
              <p>{n.summary}</p>
              <p className="section-hint">{n.requirements}</p>
              <a href={n.url} target="_blank" rel="noopener noreferrer">
                {t('tools.renta.official')}
              </a>
            </details>
          </li>
        ))}
      </ul>
    </Step>
  );
}
