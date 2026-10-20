import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import type { RentaProperty } from '../../domain/rentaExtras';
import {
  addProperty,
  daysInYear,
  propertiesOf,
  removeProperty,
  setProperty,
} from '../../domain/rentaForm';
import {
  propertyResult,
  reductionMissing,
  reductionOf,
  type PropertyForm,
  type PropertyUse,
} from '../../domain/rentaRentals';
import { Field, RadioOptions, useMoney, type StepProps } from './shared';

const USES: PropertyUse[] = ['home', 'season', 'tourist', 'business', 'other'];
/** Information cards of the catalogue, not amounts. */
const SKIPPED = 'no-deducibles';

type Flag = 'tensioned' | 'rentDrop' | 'young' | 'social' | 'rehabilitated';

/** A tick box of the property. */
function Check({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="renta-check" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

/** How it is let, when the contract was signed and what gives the reduction of art. 23.2. */
function ReductionQuestions({
  p,
  n,
  update,
}: {
  p: PropertyForm;
  n: number;
  update: (patch: Partial<PropertyForm>) => void;
}) {
  const { t } = useI18n();
  const k = (key: string) => `tools.renta.property.${key}`;
  const flags: Flag[] = p.tensioned
    ? ['tensioned', 'rentDrop', 'young', 'social', 'rehabilitated']
    : ['tensioned', 'social', 'rehabilitated'];
  const reduction = reductionOf(p);
  return (
    <div className="renta-block">
      <div className="tools-field">
        <label htmlFor={`renta-prop-${n}-use`}>{t(k('use'))}</label>
        <select
          id={`renta-prop-${n}-use`}
          className="tx-input"
          value={p.use}
          onChange={(e) => update({ use: e.target.value as PropertyUse })}
        >
          {USES.map((u) => (
            <option key={u} value={u}>
              {t(k(`useOpt.${u}`))}
            </option>
          ))}
        </select>
        <small className="renta-field-hint">{t(k(`useHint.${p.use}`))}</small>
      </div>
      {p.use === 'home' && (
        <>
          <p className="renta-question">{t(k('contract'))}</p>
          <RadioOptions
            name={`renta-prop-${n}-contract`}
            options={(['before', 'after'] as const).map((value) => ({
              value,
              label: t(k(`contractOpt.${value}`)),
            }))}
            value={p.contract || null}
            onChange={(v) => update({ contract: v as PropertyForm['contract'] })}
          />
          {p.contract === 'after' &&
            flags.map((f) => (
              <Check
                key={f}
                id={`renta-prop-${n}-${f}`}
                label={t(k(`flag.${f}`))}
                checked={p[f]}
                onChange={(on) => update({ [f]: on })}
              />
            ))}
        </>
      )}
      <p className="renta-gives" role="status">
        {reductionMissing(p)
          ? t(k('reductionMissing'))
          : reduction
            ? t(k('reductionIs'), { percent: reduction.percent })
            : t(k('reductionNone'))}
      </p>
      <Check
        id={`renta-prop-${n}-irregular`}
        label={t(k('irregular'))}
        checked={p.irregular}
        onChange={(on) => update({ irregular: on })}
      />
      <Check
        id={`renta-prop-${n}-relative`}
        label={t(k('relative'))}
        checked={p.relative}
        onChange={(on) => update({ relative: on })}
      />
    </div>
  );
}

/** What the property gives, in one line: net, reduction, the reduced net and the imputed rent. */
function PropertySummary({
  p,
  property,
  year,
}: {
  p: PropertyForm;
  property: RentaProperty;
  year: number;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const r = propertyResult(p, property, daysInYear(year), parseDecimal, {
    standard: property.imputation.standardRate,
    revised: property.imputation.revisedRate,
  });
  const rate = p.revised ? property.imputation.revisedRate : property.imputation.standardRate;
  return (
    <ul className="renta-property-summary" aria-label={t('tools.renta.property.summary')}>
      <li>
        {t('tools.renta.property.net')} <strong>{money(r.net)}</strong>
      </li>
      <li>
        {t('tools.renta.property.reducedNet')} <strong>{money(r.reducedNet)}</strong>
      </li>
      {r.excessCarry > 0 && (
        <li>
          {t('tools.renta.property.excess')} <strong>{money(r.excessCarry)}</strong>
        </li>
      )}
      {r.disposalDays > 0 && (
        <li>
          {t('tools.renta.property.imputed', { days: r.disposalDays })}{' '}
          <strong>{money(Math.round(r.imputedValue * rate) / 100)}</strong>
        </li>
      )}
    </ul>
  );
}

/** One rented property: who owns it, the days, the money and the reduction. */
export function PropertyCard({
  form,
  set,
  index,
  property,
  year,
}: StepProps & { index: number; property: RentaProperty; year: number }) {
  const { t } = useI18n();
  const list = propertiesOf(form);
  const p = list[index];
  const n = index + 1;
  const k = (key: string) => `tools.renta.property.${key}`;
  const update = (patch: Partial<PropertyForm>) => set(setProperty(form, index, patch));
  const field = (key: keyof PropertyForm) => (
    <Field
      id={`renta-prop-${n}-${key}`}
      label={t(k(`field.${key}`))}
      hint={t(k(`hint.${key}`))}
      value={p[key] as string}
      onChange={(v) => update({ [key]: v })}
    />
  );
  return (
    <fieldset className="renta-property">
      <legend>{t(k('legend'), { n, label: p.label })}</legend>
      <div className="tools-form">
        <div className="tools-field">
          <label htmlFor={`renta-prop-${n}-label`}>{t(k('field.label'))}</label>
          <input
            id={`renta-prop-${n}-label`}
            className="tx-input"
            value={p.label}
            onChange={(e) => update({ label: e.target.value })}
          />
          <small className="renta-field-hint">{t(k('hint.label'))}</small>
        </div>
        {field('share')}
        {field('rentedDays')}
        {field('otherDays')}
        {field('income')}
      </div>
      <Check
        id={`renta-prop-${n}-usufruct`}
        label={t(k('usufruct'))}
        checked={p.usufruct === true}
        onChange={(on) => update({ usufruct: on })}
      />
      <h4>{t(k('expenses'))}</h4>
      <p className="section-hint">{t(k('expensesHint'))}</p>
      <div className="tools-form">
        {property.rental.expenses
          .filter((item) => item.id !== SKIPPED)
          .map((item) => (
            <Field
              key={item.id}
              id={`renta-prop-${n}-exp-${item.id}`}
              label={item.id === 'amortizacion' ? t(k('furniture')) : item.title}
              hint={[item.summary, item.limitNote].filter(Boolean).join(' ')}
              value={p.expenses[item.id] ?? ''}
              onChange={(v) => update({ expenses: { ...p.expenses, [item.id]: v } })}
            />
          ))}
        {field('pendingExcess')}
        {field('withheld')}
      </div>
      <h4>{t(k('depreciation'))}</h4>
      <p className="section-hint">{property.rental.amortizationNote}</p>
      <div className="tools-form">
        {field('cost')}
        {field('cadastral')}
        {field('cadastralBuilding')}
      </div>
      <Check
        id={`renta-prop-${n}-revised`}
        label={t('tools.renta.revised', { rate: property.imputation.revisedRate })}
        checked={p.revised}
        onChange={(on) => update({ revised: on })}
      />
      <ReductionQuestions p={p} n={n} update={update} />
      <PropertySummary p={p} property={property} year={year} />
      {list.length > 1 && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => set(removeProperty(form, index))}
        >
          {t(k('remove'), { label: p.label })}
        </button>
      )}
    </fieldset>
  );
}

/** «Add another property». */
export function AddProperty({ form, set }: StepProps) {
  const { t } = useI18n();
  return (
    <div className="button-row">
      <button type="button" className="btn-secondary" onClick={() => set(addProperty(form))}>
        + {t('tools.renta.property.add')}
      </button>
    </div>
  );
}
