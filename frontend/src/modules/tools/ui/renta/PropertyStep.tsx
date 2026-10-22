import { useI18n } from '@core/i18n/I18nContext';
import type { RentaProperty } from '../../domain/rentaExtras';
import { useRentaRules } from './RentaRulesContext';
import { propertiesOf } from '../../domain/rentaForm';
import { AddProperty, PropertyCard } from './PropertyCard';
import { SavingsDetailSection } from './SavingsDetail';
import { Field, Step, type StepProps } from './shared';

/** Rented properties, one by one: each with its share, days, money and reduction. */
export function RentalSection({
  form,
  set,
  rental,
  toggle = true,
}: StepProps & {
  rental: RentaProperty;
  /** The check box to turn it on (the guided question asks it on its own). */
  toggle?: boolean;
}) {
  const { t } = useI18n();
  const { year } = useRentaRules();
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
          {propertiesOf(form).map((_, i) => (
            <PropertyCard key={i} form={form} set={set} index={i} property={rental} year={year} />
          ))}
          <AddProperty form={form} set={set} />
          <p className="section-hint">{rental.rental.notes}</p>
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
      <RentalSection form={form} set={set} rental={property} />

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
