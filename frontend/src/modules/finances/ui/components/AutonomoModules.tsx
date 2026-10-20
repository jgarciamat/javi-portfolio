import { useMemo, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Model131FormPreview } from '@modules/taxforms/ui/FormPreviews';
import {
  activityOf as moduleActivityOf,
  moduleTableOf,
  SPECIAL_INDICES,
  specialKindOf,
} from '../../domain/objectiveModules';
import { vatActivityFor, vatTableOf, vatUnitsOf } from '../../domain/vatSimplified';
import type { Extras, ManualForm } from './AutonomoManual';
import { Check, Field, QuarterFields, Select } from './AutonomoActivity';
import { Boxes } from './AutonomoDraftResult';
import { objectiveOf, type ObjectiveForm } from './activityForm';
import { modulesView, smallOptionsOf } from './modulesView';
import { SedeFiles } from './SedeFiles';

const k = (key: string) => `app.autonomo.modules.${key}`;
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** The activity of the order: a search by name or IAE heading and the list of what matches. */
function ActivityPicker({
  year,
  value,
  onChange,
}: {
  year: number;
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const table = moduleTableOf(year).table;
  const words = fold(query).split(/\s+/).filter(Boolean);
  const found = table.filter((a) =>
    words.every((w) => fold(`${a.epigrafe} ${a.activity}`).includes(w))
  );
  const options = found.some((a) => a.id === value)
    ? found
    : [...table.filter((a) => a.id === value), ...found];
  return (
    <div className="autonomo-grid autonomo-modules-picker">
      <label className="field">
        <span className="field-label">{t(k('search'))}</span>
        <input
          className="tx-input"
          type="search"
          aria-label={t(k('search'))}
          placeholder={t(k('searchPlaceholder'))}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <small className="autonomo-hint" role="status">
          {t(k('found'), { n: found.length, total: table.length })}
        </small>
      </label>
      <label className="field">
        <span className="field-label">{t(k('activity'))}</span>
        <select
          className="tx-input"
          aria-label={t(k('activity'))}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{t(k('choose'))}</option>
          {options.map((a) => (
            <option key={a.id} value={a.id}>
              {a.epigrafe} · {a.activity}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** One row per module: its units at 1 January and the average of the year. */
function UnitFields({
  labels,
  start,
  year,
  onStart,
  onYear,
  group,
}: {
  labels: { label: string; unit: string }[];
  start: string[];
  year: string[];
  onStart: (values: string[]) => void;
  onYear: (values: string[]) => void;
  group: string;
}) {
  const { t } = useI18n();
  const set = (list: string[], i: number, v: string) =>
    labels.map((_, j) => (j === i ? v : (list[j] ?? '')));
  return (
    <table className="autonomo-modules-units">
      <caption>{group}</caption>
      <thead>
        <tr>
          <th scope="col">{t(k('module'))}</th>
          <th scope="col">{t(k('atStart'))}</th>
          <th scope="col">{t(k('average'))}</th>
        </tr>
      </thead>
      <tbody>
        {labels.map((m, i) => (
          <tr key={`${m.label}-${i}`}>
            <th scope="row">
              {m.label} <small>({m.unit})</small>
            </th>
            <td data-label={t(k('atStart'))}>
              <input
                className="tx-input"
                inputMode="decimal"
                aria-label={`${group} · ${m.label} · ${t(k('atStart'))}`}
                value={start[i] ?? ''}
                onChange={(e) => onStart(set(start, i, e.target.value))}
              />
            </td>
            <td data-label={t(k('average'))}>
              <input
                className="tx-input"
                inputMode="decimal"
                aria-label={`${group} · ${m.label} · ${t(k('average'))}`}
                placeholder={start[i] ?? ''}
                value={year[i] ?? ''}
                onChange={(e) => onYear(set(year, i, e.target.value))}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The correcting indices that can apply to the activity (instrucción 2.3). */
function IndexFields({ o, set }: { o: ObjectiveForm; set: (p: Partial<ObjectiveForm>) => void }) {
  const { t } = useI18n();
  const kind = specialKindOf(o.activityId);
  const small = smallOptionsOf(o.activityId);
  return (
    <div className="autonomo-grid">
      {kind && (
        <Select
          label={t(k(`special.${kind}`))}
          value={o.special}
          options={['', ...SPECIAL_INDICES[kind].map((s) => s.key)]}
          text={(key) => (key === '' ? t(k('choose')) : t(k(`index.${key}`)))}
          onChange={(special) => set({ special })}
        />
      )}
      {small.length > 0 && (
        <Select
          label={t(k('small'))}
          value={o.small}
          options={['', ...small.map((s) => s.key)]}
          text={(key) => t(k(key === '' ? 'smallNo' : `smallIndex.${key}`))}
          onChange={(value) => set({ small: value })}
        />
      )}
      <Select
        label={t(k('newYear'))}
        value={o.newYear}
        options={['', '1', '2']}
        text={(v) => t(k(`new.${v || 'no'}`))}
        onChange={(newYear) => set({ newYear })}
      />
    </div>
  );
}

/** The units of the modules of the simplified regime of VAT (derived from those of the IRPF). */
function VatFields({
  o,
  year,
  set,
}: {
  o: ObjectiveForm;
  year: number;
  set: (p: Partial<ObjectiveForm>) => void;
}) {
  const { t } = useI18n();
  const vat = vatActivityFor(o.activityId, year, o.vatActivity || undefined);
  const irpf = moduleActivityOf({ activityId: o.activityId }, year);
  const input = objectiveOf(o);
  const derived = vat ? vatUnitsOf(vat, irpf, input.unitsStart) : [];
  return (
    <>
      <h4>{t(k('vatTitle'))}</h4>
      <p className="section-hint">{t(k('vatHint'))}</p>
      <div className="autonomo-grid">
        <Select
          label={t(k('vatActivity'))}
          value={vat?.id ?? ''}
          options={['', ...vatTableOf(year).map((v) => v.id)]}
          text={(id) => {
            const a = vatTableOf(year).find((v) => v.id === id);
            return a ? `${a.epigrafe} · ${a.activity}` : t(k('vatNone'));
          }}
          onChange={(vatActivity) => set({ vatActivity })}
        />
      </div>
      {vat ? (
        <>
          <UnitFields
            group={t(k('vatUnits'))}
            labels={vat.modules}
            start={vat.modules.map((_, i) => o.vatStart[i] ?? '')}
            year={vat.modules.map((_, i) => o.vatYear[i] ?? '')}
            onStart={(vatStart) => set({ vatStart })}
            onYear={(vatYear) => set({ vatYear })}
          />
          <small className="autonomo-hint">
            {t(k('vatDerived'), {
              units: derived.map((d) => String(d).replace('.', ',')).join(' · '),
            })}
          </small>
          <div className="autonomo-grid">
            <Field
              label={t(k('vatSupported'))}
              hint={t(k('vatSupportedHint'))}
              value={o.vatSupported}
              onChange={(vatSupported) => set({ vatSupported })}
            />
            <Field
              label={t(k('vatCompensations'))}
              value={o.vatCompensations}
              onChange={(vatCompensations) => set({ vatCompensations })}
            />
            <Field
              label={t(k('vatReduction'))}
              hint={t(k('vatReductionHint'))}
              value={o.vatReduction}
              onChange={(vatReduction) => set({ vatReduction })}
            />
            <Field
              label={t(k('vatRefundsAbroad'))}
              value={o.vatRefundsAbroad}
              onChange={(vatRefundsAbroad) => set({ vatRefundsAbroad })}
            />
          </div>
        </>
      ) : (
        <p className="section-hint">{t(k('vatRecargo'))}</p>
      )}
    </>
  );
}

/**
 * A non-farming activity in módulos: the activity of the order (by name or IAE heading), its units,
 * the indices, the days of season or of start and end, and the VAT of the simplified regime.
 */
export function ObjectiveFields({
  value,
  year,
  simplifiedVat,
  paid131,
  onPaid131,
  onChange,
}: {
  value: ObjectiveForm;
  year: number;
  /** The VAT of the year is in the simplified regime: its modules are asked too. */
  simplifiedVat: boolean;
  /** Box 15 of each 131 filed (the payments of the Renta, box 0604). */
  paid131: string[];
  onPaid131: (values: string[]) => void;
  onChange: (value: ObjectiveForm) => void;
}) {
  const { t } = useI18n();
  const o = value;
  const set = (patch: Partial<ObjectiveForm>) => onChange({ ...o, ...patch });
  const act = moduleActivityOf({ activityId: o.activityId }, year);
  const salaried = act?.modules.some((m) => /personal asalariado/i.test(m.label)) ?? false;
  return (
    <section className="autonomo-modules" aria-label={t(k('title'))}>
      <h4>{t(k('title'))}</h4>
      <p className="section-hint">{t(k('hint'))}</p>
      <ActivityPicker
        year={year}
        value={o.activityId}
        // A new activity has other modules: its units start empty.
        onChange={(activityId) =>
          set({ activityId, unitsStart: [], unitsYear: [], special: '', vatActivity: '' })
        }
      />
      {act && (
        <>
          <p className="section-hint">{t(k('unitsHint'))}</p>
          <UnitFields
            group={t(k('irpfUnits'))}
            labels={act.modules}
            start={o.unitsStart}
            year={o.unitsYear}
            onStart={(unitsStart) => set({ unitsStart })}
            onYear={(unitsYear) => set({ unitsYear })}
          />
          <div className="autonomo-grid">
            {salaried && (
              <Field
                label={t(k('staffLastYear'))}
                hint={t(k('staffLastYearHint'))}
                value={o.staffLastYear}
                onChange={(staffLastYear) => set({ staffLastYear })}
              />
            )}
            <Field
              label={t(k('extraordinary'))}
              hint={t(k('extraordinaryHint'))}
              value={o.extraordinary}
              onChange={(extraordinary) => set({ extraordinary })}
            />
            <Field
              label={t(k('otherIncome'))}
              hint={t(k('otherIncomeHint'))}
              value={o.otherIncome}
              onChange={(otherIncome) => set({ otherIncome })}
            />
          </div>
          <IndexFields o={o} set={set} />
          <div className="autonomo-checks">
            <Check
              label={t(k('disabled'))}
              checked={o.disabled}
              onChange={(disabled) => set({ disabled })}
            />
            <Check
              label={t(k('ceutaMelilla'))}
              checked={o.ceutaMelilla}
              onChange={(ceutaMelilla) => set({ ceutaMelilla })}
            />
            <Check
              label={t(k('noData'))}
              checked={o.noData}
              onChange={(noData) => set({ noData })}
            />
          </div>
          <details className="renta-group">
            <summary>{t(k('days'))}</summary>
            <p className="section-hint">{t(k('daysHint'))}</p>
            <div className="autonomo-grid">
              <Field
                type="date"
                label={t(k('startDate'))}
                value={o.startDate}
                onChange={(startDate) => set({ startDate })}
              />
              <Field
                type="date"
                label={t(k('endDate'))}
                value={o.endDate}
                onChange={(endDate) => set({ endDate })}
              />
              <Field
                label={t(k('seasonDays'))}
                value={o.seasonDays}
                onChange={(seasonDays) => set({ seasonDays })}
              />
              <Field
                label={t(k('seasonLastYear'))}
                value={o.seasonLastYear}
                onChange={(seasonLastYear) => set({ seasonLastYear })}
              />
            </div>
            <QuarterFields
              title={t(k('seasonQuarter'))}
              values={o.seasonQuarters}
              onChange={(seasonQuarters) => set({ seasonQuarters })}
            />
          </details>
          {simplifiedVat && <VatFields o={o} year={year} set={set} />}
          <h4>{t(k('paid131'))}</h4>
          <p className="section-hint">{t(k('paid131Hint'))}</p>
          <QuarterFields title={t(k('paid'))} values={paid131} onChange={onPaid131} />
        </>
      )}
    </section>
  );
}

/**
 * The modelo 131 of the quarter and, in the simplified regime of VAT, the 303 (page 2): the boxes,
 * the preview of the form and the file for the sede. Worked out on the device.
 */
export function ModulesResult({
  manual,
  extras,
  year,
  quarter,
}: {
  manual: ManualForm;
  extras: Extras;
  year: number;
  quarter: 1 | 2 | 3 | 4;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const view = useMemo(
    () => modulesView(manual, extras, year, quarter),
    [manual, extras, year, quarter]
  );
  if (!view) return <p className="section-hint">{t(k('missing'))}</p>;
  const { instalments, vat } = view;
  const net = instalments.net;
  const sources = [
    {
      model: '131' as const,
      year,
      quarter,
      result: view.result131,
      modules: view.file131,
    },
    ...(vat && vat !== 'none'
      ? [
          {
            model: '303' as const,
            year,
            quarter,
            simplified: vat.result,
            activity: vat.file,
          },
        ]
      : []),
  ];
  return (
    <section className="autonomo-panel autonomo-modules-result" id="autonomo-modules-result">
      <h3>{t(k('resultTitle'), { n: quarter, year })}</h3>
      <p className="section-hint">
        {t(k('net131'), {
          activity: `${view.activity.epigrafe} · ${view.activity.activity}`,
          net: money(net.net),
          rate: instalments.rate,
          staff: String(instalments.staff).replace('.', ','),
        })}
      </p>
      {view.provisional && <p className="section-hint">{t(k('provisional'), { year })}</p>}
      {view.input.noData && <p className="section-hint">{t(k('noDataNote'))}</p>}
      <Boxes title={t(k('boxes131'))} boxes={view.result131.boxes} />
      <p className="autonomo-modules-due">
        {t(k(`result131.${view.result131.result}`), {
          amount: money(Math.abs(boxOf(view.result131.boxes, '15'))),
        })}
      </p>
      <Model131FormPreview result={view.result131} year={year} quarter={quarter} />
      {vat === 'none' && <p className="section-hint">{t(k('vatRecargo'))}</p>}
      {vat && vat !== 'none' && (
        <>
          <Boxes
            title={t(k('boxes303'), {
              activity: `${vat.activity.epigrafe} · ${vat.activity.activity}`,
            })}
            // Box 65 is a percentage (100 %): it goes in the file, not in this list of euros.
            boxes={vat.result.boxes.filter((b) => b.box !== '65')}
          />
          <ul className="renta-minimum">
            {Object.entries(vat.result.parts).map(([part, amount]) => (
              <li key={part}>
                <span>{t(k(`part.${part}`))}</span>{' '}
                <strong>
                  {['E', 'J', 'Z', 'H'].includes(part)
                    ? String(amount).replace('.', ',')
                    : money(amount)}
                </strong>
              </li>
            ))}
          </ul>
          {vat.commissions && <p className="section-hint">{t(k('commissions'))}</p>}
        </>
      )}
      <SedeFiles sources={sources} />
    </section>
  );
}

const boxOf = (boxes: { box: string; amount: number }[], id: string) =>
  boxes.find((b) => b.box === id)!.amount;
