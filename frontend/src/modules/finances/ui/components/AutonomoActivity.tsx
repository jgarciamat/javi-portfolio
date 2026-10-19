import type { ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { AGRARIAN_PRODUCTS } from '@modules/finances/domain/agrarianModules';
import type { AnnualActivity } from '@modules/finances/domain/annualActivity';
import { ASSET_METHODS, INTANGIBLE, tableOf } from '@modules/finances/domain/depreciation';
import { SUBSIDY_KINDS, type SubsidyKind } from '@modules/finances/domain/subsidies';
import type { ActivityMethod } from '@modules/finances/domain/types';
import {
  ACTIVITY_METHODS,
  activityOf,
  modalityOf,
  newAsset,
  newModuleRow,
  newSubsidy,
  type ActivityForm,
  type AssetForm,
  type ModulesForm,
  type SubsidyForm,
} from './activityForm';
import { Boxes } from './AutonomoDraftResult';
import { ObjectiveFields } from './AutonomoModules';

const k = (key: string) => `app.autonomo.activity.${key}`;

/** A text field with its label (the label names the field for screen readers too). */
export function Field({
  label,
  value,
  onChange,
  type = 'text',
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date';
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="tx-input"
        type={type}
        inputMode={type === 'text' ? 'decimal' : undefined}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <small className="autonomo-hint">{hint}</small>}
    </label>
  );
}

export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="renta-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  text,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  text: (option: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select
        className="tx-input"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {text(o)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** A list of rows with a button to add one and another to remove each. */
function Rows<T>({
  title,
  hint,
  rows,
  add,
  onChange,
  render,
}: {
  title: string;
  hint: string;
  rows: T[];
  add: () => T;
  onChange: (rows: T[]) => void;
  render: (row: T, n: number, set: (patch: Partial<T>) => void) => ReactNode;
}) {
  const { t } = useI18n();
  return (
    <>
      <h4>{title}</h4>
      <p className="section-hint">{hint}</p>
      <ul className="autonomo-expenses">
        {rows.map((row, i) => (
          <li key={i}>
            <div className="autonomo-expense-fields">
              {render(row, i + 1, (patch) =>
                onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
              )}
            </div>
            <button
              type="button"
              className="btn-secondary autonomo-remove"
              aria-label={`${t('app.common.delete')} ${title} ${i + 1}`}
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="autonomo-add" onClick={() => onChange([...rows, add()])}>
        + {title}
      </button>
    </>
  );
}

/** One asset: what it is, its cost, when it began to be used and how it is depreciated. */
function AssetFields({
  asset,
  n,
  method,
  set,
}: {
  asset: AssetForm;
  n: number;
  method: ActivityMethod;
  set: (patch: Partial<AssetForm>) => void;
}) {
  const { t } = useI18n();
  const table = tableOf(modalityOf(method));
  // Intangibles have their own rule outside modules; in modules they are group 4 of the table.
  const groups = [...table.map((g) => g.id), ...(method === 'objective' ? [] : [INTANGIBLE])];
  const building = table.find((g) => g.id === asset.group)?.building;
  const label = (key: string) => `${t(k(`asset.${key}`))} ${n}`;
  return (
    <>
      <Field label={label('name')} value={asset.name} onChange={(name) => set({ name })} />
      <Select
        label={label('group')}
        value={asset.group}
        options={groups}
        text={(g) => t(k(`group.${g}`))}
        onChange={(group) => set({ group })}
      />
      <Field label={label('cost')} value={asset.cost} onChange={(cost) => set({ cost })} />
      {building && (
        <Field label={label('land')} value={asset.land} onChange={(land) => set({ land })} />
      )}
      <Field
        label={label('start')}
        type="date"
        value={asset.start}
        onChange={(start) => set({ start })}
      />
      <Field label={label('use')} value={asset.use} onChange={(use) => set({ use })} />
      <Select
        label={label('method')}
        value={asset.method}
        options={ASSET_METHODS}
        text={(m) => t(k(`method.${m}`))}
        onChange={(m) => set({ method: m })}
      />
      {asset.group === INTANGIBLE ? (
        <Field label={label('life')} value={asset.life} onChange={(life) => set({ life })} />
      ) : (
        <Field label={label('rate')} value={asset.rate} onChange={(rate) => set({ rate })} />
      )}
      <Field
        label={label('accumulated')}
        value={asset.accumulated}
        onChange={(accumulated) => set({ accumulated })}
      />
      <Field label={label('vat')} value={asset.vat} onChange={(vat) => set({ vat })} />
      <Field label={label('vatPct')} value={asset.vatPct} onChange={(vatPct) => set({ vatPct })} />
      <Check label={label('used')} checked={asset.used} onChange={(used) => set({ used })} />
    </>
  );
}

/** One grant: what kind, how much, when, and the asset it financed. */
function SubsidyFields({
  subsidy,
  n,
  assets,
  set,
}: {
  subsidy: SubsidyForm;
  n: number;
  assets: AssetForm[];
  set: (patch: Partial<SubsidyForm>) => void;
}) {
  const { t } = useI18n();
  const label = (key: string) => `${t(k(`subsidy.${key}`))} ${n}`;
  const options = ['', ...assets.map((_, i) => String(i))];
  return (
    <>
      <Field label={label('name')} value={subsidy.name} onChange={(name) => set({ name })} />
      <Select<SubsidyKind>
        label={label('kind')}
        value={subsidy.kind}
        options={SUBSIDY_KINDS}
        text={(kind) => t(k(`subsidyKind.${kind}`))}
        onChange={(kind) => set({ kind })}
      />
      <Field
        label={label('amount')}
        value={subsidy.amount}
        onChange={(amount) => set({ amount })}
      />
      <Field label={label('year')} value={subsidy.year} onChange={(year) => set({ year })} />
      <Select
        label={label('quarter')}
        value={subsidy.quarter}
        options={['1', '2', '3', '4']}
        text={(q) => t('app.autonomo.quarterN', { n: q })}
        onChange={(quarter) => set({ quarter })}
      />
      {subsidy.kind === 'capital' && (
        <Select
          label={label('asset')}
          value={subsidy.asset}
          options={options}
          text={(i) =>
            i === '' ? t(k('subsidy.noAsset')) : assets[Number(i)].name || `#${Number(i) + 1}`
          }
          onChange={(asset) => set({ asset })}
        />
      )}
    </>
  );
}

const CORRECTOR_FLAGS = [
  'externalMeans',
  'boughtFeed',
  'organic',
  'forestPlan',
  'youngFarmer',
] as const;
const CORRECTOR_SHARES = ['staffShare', 'rentedShare', 'irrigatedShare'] as const;
const PRODUCTS = AGRARIAN_PRODUCTS.map((p) => p.id);

/** Farming in modules: the income of each product, the CAP aid and the correctors. */
function ModulesFields({
  modules,
  onChange,
}: {
  modules: ModulesForm;
  onChange: (patch: Partial<ModulesForm>) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <Rows
        title={t(k('modules.rows'))}
        hint={t(k('modules.rowsHint'))}
        rows={modules.rows}
        add={newModuleRow}
        onChange={(rows) => onChange({ rows })}
        render={(row, n, set) => (
          <>
            <Select
              label={`${t(k('modules.product'))} ${n}`}
              value={row.product}
              options={PRODUCTS}
              text={(p) => t(k(`product.${p}`))}
              onChange={(product) => set({ product })}
            />
            <Field
              label={`${t(k('modules.income'))} ${n}`}
              value={row.income}
              onChange={(income) => set({ income })}
            />
            <Field
              label={`${t(k('modules.reduced'))} ${n}`}
              value={row.reduced}
              onChange={(reduced) => set({ reduced })}
            />
            <Check
              label={`${t(k('modules.transformed'))} ${n}`}
              checked={row.transformed}
              onChange={(transformed) => set({ transformed })}
            />
          </>
        )}
      />
      <div className="autonomo-grid">
        <Field
          label={t(k('modules.pacAid'))}
          value={modules.pacAid}
          onChange={(pacAid) => onChange({ pacAid })}
        />
        {CORRECTOR_SHARES.map((key) => (
          <Field
            key={key}
            label={t(k(`modules.${key}`))}
            value={modules[key]}
            onChange={(value) => onChange({ [key]: value })}
          />
        ))}
        <Field
          label={t(k('modules.refunds'))}
          value={modules.refunds}
          onChange={(refunds) => onChange({ refunds })}
        />
        <Field
          label={t(k('modules.extraordinary'))}
          value={modules.extraordinary}
          onChange={(extraordinary) => onChange({ extraordinary })}
        />
      </div>
      <div className="autonomo-checks">
        {CORRECTOR_FLAGS.map((key) => (
          <Check
            key={key}
            label={t(k(`modules.${key}`))}
            checked={modules[key]}
            onChange={(value) => onChange({ [key]: value })}
          />
        ))}
      </div>
    </>
  );
}

/** Four fields, one a quarter. */
export function QuarterFields({
  title,
  values,
  onChange,
}: {
  title: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="autonomo-grid">
      {values.map((v, i) => (
        <Field
          key={i}
          label={`${title} · ${t('app.autonomo.quarterN', { n: i + 1 })}`}
          value={v}
          onChange={(value) => onChange(values.map((x, j) => (j === i ? value : x)))}
        />
      ))}
    </div>
  );
}

/** In modules: the farming products (annex I) or the activity of annex II and its units. */
function ModulesOfActivity({
  a,
  year,
  simplifiedVat,
  set,
}: {
  a: ActivityForm;
  year: number;
  simplifiedVat: boolean;
  set: (patch: Partial<ActivityForm>) => void;
}) {
  if (a.method !== 'objective') return null;
  if (a.agrarian)
    return (
      <ModulesFields
        modules={a.modules}
        onChange={(m) => set({ modules: { ...a.modules, ...m } })}
      />
    );
  return (
    <ObjectiveFields
      value={a.objective}
      year={year}
      simplifiedVat={simplifiedVat}
      paid131={a.paid130}
      onPaid131={(paid130) => set({ paid130 })}
      onChange={(objective) => set({ objective })}
    />
  );
}

/**
 * The activity of the year beyond the quarters: how it is taxed, the assets and their
 * depreciation, the grants and the other annual figures the Renta needs.
 */
export function ActivityPanel({
  value,
  year,
  reagp,
  simplifiedVat = false,
  onChange,
}: {
  value: ActivityForm | undefined;
  year: number;
  /** The VAT of the year is in the special agricultural regime: its compensations are asked for. */
  reagp: boolean;
  /** The VAT of the year is in the simplified regime: the modules of the VAT are asked for. */
  simplifiedVat?: boolean;
  onChange: (value: ActivityForm) => void;
}) {
  const { t } = useI18n();
  const a = activityOf(value);
  const set = (patch: Partial<ActivityForm>) => onChange({ ...a, ...patch });
  const objective = a.method === 'objective';
  return (
    <section className="autonomo-panel" id="autonomo-activity">
      <h3>{t(k('title'))}</h3>
      <p className="section-hint">{t(k('hint'))}</p>
      <div className="autonomo-grid">
        <Select
          label={t(k('methodLabel'))}
          value={a.method}
          options={ACTIVITY_METHODS}
          text={(m) => t(k(`regime.${m}`))}
          onChange={(method) => set({ method })}
        />
      </div>
      <small className="autonomo-hint">{t(k(`regimeHint.${a.method}`))}</small>
      <div className="autonomo-checks">
        <Check
          label={t(k('agrarian'))}
          checked={a.agrarian}
          onChange={(agrarian) => set({ agrarian })}
        />
      </div>
      {a.agrarian && !objective && <small className="autonomo-hint">{t(k('agrarianHint'))}</small>}

      <Rows
        title={t(k('assets'))}
        hint={t(k(objective ? 'assetsHintModules' : 'assetsHint'))}
        rows={a.assets}
        add={() => newAsset(year)}
        onChange={(assets) => set({ assets })}
        render={(asset, n, setAsset) => (
          <AssetFields asset={asset} n={n} method={a.method} set={setAsset} />
        )}
      />
      <Rows
        title={t(k('subsidies'))}
        hint={t(k('subsidiesHint'))}
        rows={a.subsidies}
        add={() => newSubsidy(year)}
        onChange={(subsidies) => set({ subsidies })}
        render={(subsidy, n, setSubsidy) => (
          <SubsidyFields subsidy={subsidy} n={n} assets={a.assets} set={setSubsidy} />
        )}
      />

      <ModulesOfActivity a={a} year={year} simplifiedVat={simplifiedVat} set={set} />

      {!objective && (
        <>
          <h4>{t(k('annual'))}</h4>
          <div className="autonomo-grid">
            {a.method === 'normal' && (
              <Field
                label={t(k('provisions'))}
                hint={t(k('provisionsHint'))}
                value={a.provisions}
                onChange={(provisions) => set({ provisions })}
              />
            )}
            <Field
              label={t(k('retaFix'))}
              hint={t(k('retaFixHint'))}
              value={a.retaFix}
              onChange={(retaFix) => set({ retaFix })}
            />
            <Field
              label={t(k('selfConsumption'))}
              value={a.selfConsumption}
              onChange={(selfConsumption) => set({ selfConsumption })}
            />
            <Field
              label={t(k('stockChange'))}
              hint={t(k('stockChangeHint'))}
              value={a.stockChange}
              onChange={(stockChange) => set({ stockChange })}
            />
          </div>
          {(reagp || a.agrarian) && (
            <>
              <h4>{t(k('compensations'))}</h4>
              <p className="section-hint">{t(k('compensationsHint'))}</p>
              <QuarterFields
                title={t(k('compensation'))}
                values={a.compensations}
                onChange={(compensations) => set({ compensations })}
              />
            </>
          )}
          <h4>{t(k('paid130'))}</h4>
          <p className="section-hint">{t(k('paid130Hint'))}</p>
          <QuarterFields
            title={t(k('paid'))}
            values={a.paid130}
            onChange={(paid130) => set({ paid130 })}
          />
        </>
      )}
    </section>
  );
}

/** Official names of the Renta boxes the annual summary gives (modelo 100 of 2025). */
const RENTA_BOXES: Record<string, string> = {
  '0171': 'Ingresos de explotación',
  '0173': 'Ingresos por subvenciones corrientes',
  '0174': 'Imputación de ingresos por subvenciones de capital',
  '0175': 'Autoconsumo de bienes y servicios',
  '0176': 'IVA devengado (compensación de agricultura, ganadería y pesca)',
  '0177': 'Variación de existencias (incremento)',
  '0180': 'Total ingresos computables',
  '0182': 'Variación de existencias (disminución)',
  '0183': 'Otros consumos de explotación',
  '0184': 'Sueldos y salarios',
  '0186': 'Seguridad Social del titular de la actividad',
  '0191': 'Gastos de manutención del contribuyente',
  '0192': 'Arrendamientos y cánones',
  '0194': 'Suministros',
  '0196': 'Regularización cuotas RETA (a ingresar)',
  '0197': 'Regularización cuotas RETA (a devolver)',
  '0199': 'Servicios de profesionales independientes',
  '0200': 'Primas de seguros',
  '0202': 'Otros servicios exteriores',
  '0208': 'Amortización del inmovilizado material',
  '0227': 'Amortización del inmovilizado intangible',
  '0218': 'Suma de gastos',
  '0219': 'Provisiones fiscalmente deducibles',
  '0220': 'Total gastos deducibles',
  '0221': 'Diferencia',
  '0222': 'Provisiones deducibles y gastos de difícil justificación',
  '0223': 'Total gastos deducibles',
  '0224': 'Rendimiento neto',
  '1536': 'Total ingresos',
  '1537': 'Rendimiento neto previo',
  '1538': 'Amortización del inmovilizado material e intangible',
  '1539': 'Rendimiento neto minorado',
  '1548': 'Rendimiento neto de módulos',
  '1549': 'Reducción de carácter general',
  '1550': 'Diferencia',
  '1551': 'Reducción agricultores jóvenes',
  '0239': 'Reintegro de subvenciones',
  '1552': 'Gastos extraordinarios por circunstancias excepcionales',
  '1553': 'Rendimiento neto de la actividad',
  '0599': 'Retenciones por rendimientos de actividades económicas',
  '0604': 'Pagos fraccionados ingresados',
};

/** The year of the activity as it goes to the Renta: the totals, the boxes and the warnings. */
export function ActivitySummaryPanel({ annual }: { annual: AnnualActivity }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const boxes = Object.entries(annual.boxes)
    .filter(([, v]) => v !== 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([box, amount]) => ({ box, label: RENTA_BOXES[box] ?? box, amount }));
  return (
    <section className="autonomo-panel" id="autonomo-activity-summary">
      <h3>{t(k('summary'), { year: annual.year })}</h3>
      <p className="section-hint">{t(k(`regime.${annual.regime}`))}</p>
      <ul className="autonomo-activity-totals">
        <li>
          {t(k('net'))}:{' '}
          <strong>{annual.net === null ? t(k('notCalculated')) : money(annual.net)}</strong>
        </li>
        <li>
          {t(k('withholdings'))}: <strong>{money(annual.withholdings)}</strong>
        </li>
        <li>
          {t(k('payments'))}: <strong>{money(annual.payments130.total)}</strong>
        </li>
      </ul>
      {boxes.length > 0 && <Boxes title={t(k('boxes'))} boxes={boxes} />}
      <ul className="autonomo-warnings">
        {annual.warnings.map((w) => (
          <li key={w}>{t(k(`warning.${w}`))}</li>
        ))}
      </ul>
    </section>
  );
}
